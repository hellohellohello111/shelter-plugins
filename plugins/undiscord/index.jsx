const {
  flux: { stores },
  plugin: { store, scoped },
  settings: { registerSection },
  ui: {
    Header,
    HeaderTags,
    Text,
    TextBox,
    Button,
    ButtonColors,
    ButtonSizes,
    SwitchItem,
    Divider,
    showToast,
    openModal,
    ModalRoot,
    ModalHeader,
    ModalBody,
    ModalFooter,
    injectCss,
  },
  solid: { createSignal, createEffect, onCleanup, Show },
} = shelter;

// ── Discord epoch for snowflake conversion ──
const DISCORD_EPOCH = 1420070400000n;

function dateToSnowflake(dateStr) {
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return null;
  return String((BigInt(ts) - DISCORD_EPOCH) << 22n);
}

// ── Rate-limited fetch wrapper ──
async function discordFetch(url, options = {}) {
  const token = getToken();
  if (!token) throw new Error("Could not retrieve auth token");

  const resp = await fetch(`https://discord.com/api/v9${url}`, {
    ...options,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (resp.status === 429) {
    const data = await resp.json();
    const retryAfter = (data.retry_after || 1) * 1000;
    await sleep(retryAfter * 2);
    return discordFetch(url, options);
  }

  if (resp.status === 202) {
    const data = await resp.json();
    const retryAfter = (data.retry_after || 2) * 1000;
    await sleep(retryAfter);
    return discordFetch(url, options);
  }

  return resp;
}

function getToken() {
  // grab token from webpack internals
  try {
    const mods = webpackChunkdiscord_app.push([
      [Symbol()],
      {},
      (r) => {
        const cache = r.c;
        webpackChunkdiscord_app.pop();
        return cache;
      },
    ]);
    for (const id in mods) {
      const mod = mods[id]?.exports;
      if (mod?.default?.getToken) return mod.default.getToken();
      if (mod?.getToken) return mod.getToken();
    }
  } catch {}
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Search messages ──
async function searchMessages(guildId, channelId, authorId, opts = {}) {
  const params = new URLSearchParams();
  if (authorId) params.set("author_id", authorId);
  if (channelId && guildId !== "@me") params.set("channel_id", channelId);
  if (opts.minId) params.set("min_id", opts.minId);
  if (opts.maxId) params.set("max_id", opts.maxId);
  if (opts.content) params.set("content", opts.content);
  if (opts.hasLink) params.append("has", "link");
  if (opts.hasFile) params.append("has", "file");
  if (opts.includeNsfw) params.set("include_nsfw", "true");
  params.set("sort_by", "timestamp");
  params.set("sort_order", "desc");
  if (opts.offset) params.set("offset", String(opts.offset));

  const base =
    guildId === "@me"
      ? `/channels/${channelId}/messages/search`
      : `/guilds/${guildId}/messages/search`;

  const resp = await discordFetch(`${base}?${params.toString()}`);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Search failed (${resp.status}): ${text}`);
  }
  return resp.json();
}

// ── Delete a single message ──
async function deleteMessage(channelId, messageId) {
  const resp = await discordFetch(
    `/channels/${channelId}/messages/${messageId}`,
    { method: "DELETE" }
  );
  if (resp.status === 204) return "OK";
  if (resp.status === 404) return "SKIP"; // already deleted
  if (resp.status === 403) return "FORBIDDEN";
  const text = await resp.text();
  throw new Error(`Delete failed (${resp.status}): ${text}`);
}

// ── Main deletion engine ──
let running = false;
let stopRequested = false;

async function runDeletion(config, onProgress) {
  running = true;
  stopRequested = false;

  const {
    guildId,
    channelId,
    authorId,
    beforeDate,
    afterDate,
    content,
    hasLink,
    hasFile,
    includeNsfw,
    includePinned,
    pattern,
    searchDelay,
    deleteDelay,
  } = config;

  const minId = afterDate ? dateToSnowflake(afterDate) : null;
  const maxId = beforeDate ? dateToSnowflake(beforeDate) : null;
  const regex = pattern ? new RegExp(pattern, "i") : null;

  let deleted = 0;
  let skipped = 0;
  let failed = 0;
  let offset = 0;
  let totalEstimate = 0;

  const userId = authorId || stores.UserStore?.getCurrentUser()?.id;

  try {
    while (!stopRequested) {
      onProgress({ status: "searching", deleted, skipped, failed, totalEstimate });

      const data = await searchMessages(guildId, channelId, userId, {
        minId,
        maxId,
        content,
        hasLink,
        hasFile,
        includeNsfw,
        offset,
      });

      totalEstimate = data.total_results || 0;

      if (!data.messages || data.messages.length === 0) {
        break;
      }

      // flatten & extract hits
      const hits = data.messages
        .flat()
        .filter((m) => m.hit);

      if (hits.length === 0) break;

      let pageSkipped = 0;

      for (const msg of hits) {
        if (stopRequested) break;

        // filter: only own messages (types 0, 6-21)
        const t = msg.type;
        if (t !== 0 && (t < 6 || t > 21)) {
          pageSkipped++;
          skipped++;
          continue;
        }

        // filter: pinned
        if (msg.pinned && !includePinned) {
          pageSkipped++;
          skipped++;
          continue;
        }

        // filter: regex
        if (regex && !regex.test(msg.content)) {
          pageSkipped++;
          skipped++;
          continue;
        }

        onProgress({
          status: "deleting",
          deleted,
          skipped,
          failed,
          totalEstimate,
          currentMessage: msg.content?.substring(0, 80),
        });

        const result = await deleteMessage(msg.channel_id, msg.id);
        if (result === "OK") {
          deleted++;
        } else if (result === "SKIP") {
          skipped++;
          pageSkipped++;
        } else if (result === "FORBIDDEN") {
          failed++;
          pageSkipped++;
        }

        await sleep(deleteDelay);
      }

      // if all messages on this page were skipped, bump offset
      if (pageSkipped === hits.length) {
        offset += pageSkipped;
      } else {
        offset = 0; // deleted messages shift results, reset offset
      }

      await sleep(searchDelay);
    }
  } catch (err) {
    onProgress({
      status: "error",
      deleted,
      skipped,
      failed,
      totalEstimate,
      error: err.message,
    });
    running = false;
    return;
  }

  running = false;
  onProgress({
    status: "done",
    deleted,
    skipped,
    failed,
    totalEstimate,
  });
}

function stopDeletion() {
  stopRequested = true;
}

// ── UI ──
const styles = `
.undiscord-panel {
  padding: 16px;
  color: var(--text-normal);
}
.undiscord-panel label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--header-secondary);
}
.undiscord-panel .field {
  margin-bottom: 12px;
}
.undiscord-panel .field-row {
  display: flex;
  gap: 12px;
}
.undiscord-panel .field-row > .field {
  flex: 1;
}
.undiscord-progress {
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  background: var(--background-secondary);
  font-size: 14px;
  line-height: 1.6;
}
.undiscord-progress .stat {
  color: var(--text-muted);
}
.undiscord-progress .stat b {
  color: var(--text-normal);
}
.undiscord-progress .current-msg {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.undiscord-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
`;

function UndiscordPanel() {
  const [guildId, setGuildId] = createSignal(store.guildId || "");
  const [channelId, setChannelId] = createSignal(store.channelId || "");
  const [beforeDate, setBeforeDate] = createSignal(store.beforeDate || "");
  const [afterDate, setAfterDate] = createSignal(store.afterDate || "");
  const [content, setContent] = createSignal(store.content || "");
  const [pattern, setPattern] = createSignal(store.pattern || "");
  const [hasLink, setHasLink] = createSignal(store.hasLink || false);
  const [hasFile, setHasFile] = createSignal(store.hasFile || false);
  const [includeNsfw, setIncludeNsfw] = createSignal(store.includeNsfw || false);
  const [includePinned, setIncludePinned] = createSignal(store.includePinned || false);
  const [searchDelay, setSearchDelay] = createSignal(store.searchDelay || "1500");
  const [deleteDelay, setDeleteDelay] = createSignal(store.deleteDelay || "800");

  const [isRunning, setIsRunning] = createSignal(false);
  const [progress, setProgress] = createSignal(null);

  // auto-fill current guild/channel
  const fillCurrent = () => {
    try {
      const selectedGuild = stores.SelectedGuildStore?.getGuildId();
      const selectedChannel = stores.SelectedChannelStore?.getChannelId();
      if (selectedGuild) setGuildId(selectedGuild);
      else setGuildId("@me");
      if (selectedChannel) setChannelId(selectedChannel);
    } catch {}
  };

  const start = () => {
    if (isRunning()) return;
    if (!guildId() && !channelId()) {
      showToast({ title: "Undiscord", content: "Enter a Guild ID or Channel ID", duration: 3000 });
      return;
    }

    // persist settings
    store.guildId = guildId();
    store.channelId = channelId();
    store.beforeDate = beforeDate();
    store.afterDate = afterDate();
    store.content = content();
    store.pattern = pattern();
    store.hasLink = hasLink();
    store.hasFile = hasFile();
    store.includeNsfw = includeNsfw();
    store.includePinned = includePinned();
    store.searchDelay = searchDelay();
    store.deleteDelay = deleteDelay();

    setIsRunning(true);
    setProgress({ status: "starting", deleted: 0, skipped: 0, failed: 0, totalEstimate: 0 });

    runDeletion(
      {
        guildId: guildId() || undefined,
        channelId: channelId() || undefined,
        authorId: stores.UserStore?.getCurrentUser()?.id,
        beforeDate: beforeDate() || undefined,
        afterDate: afterDate() || undefined,
        content: content() || undefined,
        hasLink: hasLink(),
        hasFile: hasFile(),
        includeNsfw: includeNsfw(),
        includePinned: includePinned(),
        pattern: pattern() || undefined,
        searchDelay: parseInt(searchDelay()) || 1500,
        deleteDelay: parseInt(deleteDelay()) || 800,
      },
      (p) => {
        setProgress({ ...p });
        if (p.status === "done" || p.status === "error") {
          setIsRunning(false);
        }
      }
    );
  };

  const stop = () => {
    stopDeletion();
    setIsRunning(false);
  };

  return (
    <div class="undiscord-panel">
      <Header tag={HeaderTags.H1}>Undiscord</Header>
      <Text>Mass delete your own messages. Use Developer Mode to copy IDs.</Text>
      <Divider mt mb />

      <div class="field-row">
        <div class="field">
          <label>Guild / Server ID</label>
          <TextBox value={guildId()} onInput={setGuildId} placeholder="@me for DMs" />
        </div>
        <div class="field">
          <label>Channel ID</label>
          <TextBox value={channelId()} onInput={setChannelId} placeholder="Optional for guilds" />
        </div>
      </div>

      <div style={{ "margin-bottom": "12px" }}>
        <Button size={ButtonSizes.SMALL} onClick={fillCurrent}>
          Fill Current Channel
        </Button>
      </div>

      <div class="field-row">
        <div class="field">
          <label>After Date</label>
          <TextBox value={afterDate()} onInput={setAfterDate} placeholder="YYYY-MM-DD" />
        </div>
        <div class="field">
          <label>Before Date</label>
          <TextBox value={beforeDate()} onInput={setBeforeDate} placeholder="YYYY-MM-DD" />
        </div>
      </div>

      <div class="field">
        <label>Content Search (server-side)</label>
        <TextBox value={content()} onInput={setContent} placeholder="Search text" />
      </div>

      <div class="field">
        <label>Regex Pattern (client-side filter)</label>
        <TextBox value={pattern()} onInput={setPattern} placeholder="e.g. hello|world" />
      </div>

      <SwitchItem value={hasLink()} onChange={setHasLink}>
        Only messages with links
      </SwitchItem>
      <SwitchItem value={hasFile()} onChange={setHasFile}>
        Only messages with files
      </SwitchItem>
      <SwitchItem value={includeNsfw()} onChange={setIncludeNsfw}>
        Include NSFW channels
      </SwitchItem>
      <SwitchItem value={includePinned()} onChange={setIncludePinned}>
        Delete pinned messages
      </SwitchItem>

      <Divider mt mb />

      <div class="field-row">
        <div class="field">
          <label>Search Delay (ms)</label>
          <TextBox value={searchDelay()} onInput={setSearchDelay} placeholder="1500" />
        </div>
        <div class="field">
          <label>Delete Delay (ms)</label>
          <TextBox value={deleteDelay()} onInput={setDeleteDelay} placeholder="800" />
        </div>
      </div>

      <div class="undiscord-buttons">
        <Show when={!isRunning()}>
          <Button color={ButtonColors.RED} onClick={start}>
            Start Deleting
          </Button>
        </Show>
        <Show when={isRunning()}>
          <Button color={ButtonColors.PRIMARY} onClick={stop}>
            Stop
          </Button>
        </Show>
      </div>

      <Show when={progress()}>
        <div class="undiscord-progress">
          <div class="stat">
            Status: <b>{progress().status}</b>
          </div>
          <div class="stat">
            Deleted: <b>{progress().deleted}</b> | Skipped: <b>{progress().skipped}</b> | Failed: <b>{progress().failed}</b>
          </div>
          <div class="stat">
            Estimated total: <b>{progress().totalEstimate}</b>
          </div>
          <Show when={progress().currentMessage}>
            <div class="current-msg">Current: {progress().currentMessage}...</div>
          </Show>
          <Show when={progress().error}>
            <div style={{ color: "var(--text-danger)", "margin-top": "6px" }}>
              Error: {progress().error}
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

// ── Plugin lifecycle ──
let cleanupCss;
let cleanupSection;

export function onLoad() {
  cleanupCss = injectCss(styles);
  cleanupSection = registerSection("section", "undiscord", "Undiscord", UndiscordPanel);
}

export function onUnload() {
  stopDeletion();
  cleanupCss?.();
  cleanupSection?.();
}
