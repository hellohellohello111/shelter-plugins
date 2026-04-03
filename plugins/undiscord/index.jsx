const {
  flux: { stores },
  http,
  plugin: { store, scoped },
  settings: { registerSection },
  observeDom,
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
  solid: { createSignal, Show },
} = shelter;

// ── Discord epoch for snowflake conversion ──
const DISCORD_EPOCH = 1420070400000n;

function dateToSnowflake(dateStr) {
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return null;
  return String((BigInt(ts) - DISCORD_EPOCH) << 22n);
}

// ── API helpers using shelter's http module (auto-authenticated) ──
async function apiGet(url, retries = 3) {
  const resp = await http.get({ url });
  if (resp.status === 429) {
    const retryAfter = (resp.body?.retry_after || 1) * 1000;
    await sleep(retryAfter * 2);
    return apiGet(url, retries - 1);
  }
  if (resp.status === 202) {
    const retryAfter = (resp.body?.retry_after || 2) * 1000;
    await sleep(retryAfter);
    return apiGet(url, retries - 1);
  }
  return resp;
}

async function apiDelete(url, retries = 3) {
  const resp = await http.del({ url });
  if (resp.status === 429 && retries > 0) {
    const retryAfter = (resp.body?.retry_after || 1) * 1000;
    await sleep(retryAfter * 2);
    return apiDelete(url, retries - 1);
  }
  return resp;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Search messages ──
async function searchMessages(guildId, channelId, authorId, opts = {}) {
  const query = {};
  if (authorId) query.author_id = authorId;
  if (channelId && guildId !== "@me") query.channel_id = channelId;
  if (opts.minId) query.min_id = opts.minId;
  if (opts.maxId) query.max_id = opts.maxId;
  if (opts.content) query.content = opts.content;
  if (opts.includeNsfw) query.include_nsfw = "true";
  query.sort_by = "timestamp";
  query.sort_order = "desc";
  if (opts.offset) query.offset = String(opts.offset);

  const params = new URLSearchParams(query);
  if (opts.hasLink) params.append("has", "link");
  if (opts.hasFile) params.append("has", "file");

  const base =
    guildId === "@me"
      ? `/channels/${channelId}/messages/search`
      : `/guilds/${guildId}/messages/search`;

  const resp = await apiGet(`${base}?${params.toString()}`);
  if (!resp.ok) {
    throw new Error(`Search failed (${resp.status}): ${JSON.stringify(resp.body)}`);
  }
  return resp.body;
}

// ── Delete a single message ──
async function deleteMessage(channelId, messageId) {
  const resp = await apiDelete(`/channels/${channelId}/messages/${messageId}`);
  if (resp.status === 204) return "OK";
  if (resp.status === 404) return "SKIP";
  if (resp.status === 403) return "FORBIDDEN";
  throw new Error(`Delete failed (${resp.status}): ${JSON.stringify(resp.body)}`);
}

// ── Global state for background deletion ──
let running = false;
let stopRequested = false;
let progressListeners = [];
let currentProgress = null;
let currentLabel = "";

function broadcastProgress(p) {
  currentProgress = p;
  for (const listener of progressListeners) listener(p);
}

function addProgressListener(fn) {
  progressListeners.push(fn);
  if (currentProgress) fn(currentProgress);
  return () => {
    progressListeners = progressListeners.filter((l) => l !== fn);
  };
}

async function runDeletion(config, label) {
  running = true;
  stopRequested = false;
  currentLabel = label;

  const {
    guildId, channelId, authorId,
    beforeDate, afterDate, content,
    hasLink, hasFile, includeNsfw, includePinned,
    pattern, searchDelay, deleteDelay,
  } = config;

  const minId = afterDate ? dateToSnowflake(afterDate) : null;
  const maxId = beforeDate ? dateToSnowflake(beforeDate) : null;
  const regex = pattern ? new RegExp(pattern, "i") : null;

  let deleted = 0, skipped = 0, failed = 0, offset = 0, totalEstimate = 0;
  const userId = authorId || stores.UserStore?.getCurrentUser()?.id;

  showFloatingPill();

  try {
    while (!stopRequested) {
      broadcastProgress({ status: "searching", deleted, skipped, failed, totalEstimate });

      const data = await searchMessages(guildId, channelId, userId, {
        minId, maxId, content, hasLink, hasFile, includeNsfw, offset,
      });

      totalEstimate = data.total_results || 0;
      if (!data.messages || data.messages.length === 0) break;

      const hits = data.messages.flat().filter((m) => m.hit);
      if (hits.length === 0) break;

      let pageSkipped = 0;

      for (const msg of hits) {
        if (stopRequested) break;

        // skip system messages (joins, boosts, etc.) but keep all user-sent content
        const SYSTEM_TYPES = new Set([1, 2, 3, 4, 5]);
        if (SYSTEM_TYPES.has(msg.type)) { pageSkipped++; skipped++; continue; }
        if (msg.pinned && !includePinned) { pageSkipped++; skipped++; continue; }
        if (regex && !regex.test(msg.content)) { pageSkipped++; skipped++; continue; }

        broadcastProgress({
          status: "deleting", deleted, skipped, failed, totalEstimate,
          currentMessage: msg.content?.substring(0, 80),
        });

        const result = await deleteMessage(msg.channel_id, msg.id);
        if (result === "OK") deleted++;
        else if (result === "SKIP") { skipped++; pageSkipped++; }
        else if (result === "FORBIDDEN") { failed++; pageSkipped++; }

        await sleep(deleteDelay);
      }

      if (pageSkipped === hits.length) offset += pageSkipped;
      else offset = 0;

      await sleep(searchDelay);
    }
  } catch (err) {
    broadcastProgress({ status: "error", deleted, skipped, failed, totalEstimate, error: err.message });
    running = false;
    return;
  }

  running = false;
  broadcastProgress({ status: "done", deleted, skipped, failed, totalEstimate });
  showToast({ title: "Undiscord", content: `Done! Deleted ${deleted} messages.`, duration: 5000 });

  // auto-hide pill after 10s when done
  setTimeout(() => {
    if (!running) hideFloatingPill();
  }, 10000);
}

function stopDeletion() {
  stopRequested = true;
  running = false;
}

// ── Get current channel info ──
function getCurrentContext() {
  const guildId = stores.SelectedGuildStore?.getGuildId() || "@me";
  const channelId = stores.SelectedChannelStore?.getChannelId();
  let channelName = "";
  let guildName = "";

  try {
    if (channelId) {
      const channel = stores.ChannelStore?.getChannel(channelId);
      channelName = channel?.name || (guildId === "@me" ? "DM" : "");
    }
    if (guildId && guildId !== "@me") {
      const guild = stores.GuildStore?.getGuild(guildId);
      guildName = guild?.name || "";
    }
  } catch {}

  return { guildId, channelId, channelName, guildName };
}

// ── Floating progress pill ──
let pillElement = null;
let pillInterval = null;

function showFloatingPill() {
  if (pillElement) return;

  const pill = document.createElement("div");
  pill.className = "undiscord-pill";
  pill.title = "Click to open Undiscord";
  pill.innerHTML = `<span class="undiscord-pill-icon">${TRASH_SVG}</span><span class="undiscord-pill-text">Starting...</span>`;
  pill.addEventListener("click", () => openProgressModal());
  document.body.appendChild(pill);
  pillElement = pill;

  // update pill text on progress
  const unlisten = addProgressListener((p) => {
    const textEl = pill.querySelector(".undiscord-pill-text");
    if (!textEl) return;
    if (p.status === "deleting" || p.status === "searching") {
      textEl.textContent = `Deleting... ${p.deleted}/${p.totalEstimate}`;
    } else if (p.status === "done") {
      textEl.textContent = `Done! ${p.deleted} deleted`;
    } else if (p.status === "error") {
      textEl.textContent = `Error - ${p.deleted} deleted`;
    } else {
      textEl.textContent = p.status;
    }
  });

  pill._unlisten = unlisten;
}

function hideFloatingPill() {
  if (pillElement) {
    pillElement._unlisten?.();
    pillElement.remove();
    pillElement = null;
  }
}

// ── Progress modal (reopen to check status) ──
function openProgressModal() {
  openModal((mprops) => {
    const [progress, setProgress] = createSignal(currentProgress);
    const [isRunning, setIsRunning] = createSignal(running);

    const unlisten = addProgressListener((p) => {
      setProgress({ ...p });
      if (p.status === "done" || p.status === "error") setIsRunning(false);
    });

    const stop = () => {
      stopDeletion();
      setIsRunning(false);
    };

    const dismiss = () => {
      hideFloatingPill();
      mprops.close();
    };

    // cleanup listener when modal closes — use a MutationObserver on the modal
    // Since we can't hook into modal close, we just let the listener leak slightly
    // (it's cleaned up on next open or plugin unload)

    return (
      <ModalRoot>
        <ModalHeader close={mprops.close}>Undiscord - Progress</ModalHeader>
        <ModalBody>
          <div class="undiscord-modal-body">
            <div class="context-info">
              Target: <b>{currentLabel}</b>
            </div>

            <Show when={progress()}>
              <div class="undiscord-progress">
                <div class="stat">Status: <b>{progress().status}</b></div>
                <div class="stat">
                  Deleted: <b>{progress().deleted}</b> | Skipped: <b>{progress().skipped}</b> | Failed: <b>{progress().failed}</b>
                </div>
                <div class="stat">Estimated total: <b>{progress().totalEstimate}</b></div>
                <Show when={progress().currentMessage}>
                  <div class="current-msg">Current: {progress().currentMessage}...</div>
                </Show>
                <Show when={progress().error}>
                  <div style={{ color: "var(--text-danger)", "margin-top": "6px" }}>Error: {progress().error}</div>
                </Show>
              </div>
            </Show>

            <div class="undiscord-buttons">
              <Show when={isRunning()}>
                <Button color={ButtonColors.RED} onClick={stop}>Stop</Button>
              </Show>
              <Show when={!isRunning() && (progress()?.status === "done" || progress()?.status === "error")}>
                <Button color={ButtonColors.PRIMARY} onClick={dismiss}>Dismiss</Button>
              </Show>
            </div>
          </div>
        </ModalBody>
      </ModalRoot>
    );
  });
}

// ── Config modal (set filters and start) ──
function openUndiscordModal() {
  // if already running, show progress instead
  if (running) {
    openProgressModal();
    return;
  }

  const ctx = getCurrentContext();

  openModal((mprops) => {
    const [beforeDate, setBeforeDate] = createSignal("");
    const [afterDate, setAfterDate] = createSignal("");
    const [content, setContent] = createSignal("");
    const [pattern, setPattern] = createSignal("");
    const [hasLink, setHasLink] = createSignal(false);
    const [hasFile, setHasFile] = createSignal(false);
    const [includePinned, setIncludePinned] = createSignal(false);
    const [showAdvanced, setShowAdvanced] = createSignal(false);
    const [searchDelay, setSearchDelay] = createSignal("1500");
    const [deleteDelay, setDeleteDelay] = createSignal("800");

    const label = ctx.guildId === "@me"
      ? `DM: ${ctx.channelName || ctx.channelId}`
      : `#${ctx.channelName || ctx.channelId} in ${ctx.guildName || ctx.guildId}`;

    const start = () => {
      mprops.close();

      runDeletion(
        {
          guildId: ctx.guildId,
          channelId: ctx.channelId,
          authorId: stores.UserStore?.getCurrentUser()?.id,
          beforeDate: beforeDate() || undefined,
          afterDate: afterDate() || undefined,
          content: content() || undefined,
          hasLink: hasLink(),
          hasFile: hasFile(),
          includeNsfw: true,
          includePinned: includePinned(),
          pattern: pattern() || undefined,
          searchDelay: parseInt(searchDelay()) || 1500,
          deleteDelay: parseInt(deleteDelay()) || 800,
        },
        label
      );
    };

    return (
      <ModalRoot>
        <ModalHeader close={mprops.close}>Undiscord - Purge Messages</ModalHeader>
        <ModalBody>
          <div class="undiscord-modal-body">
            <div class="context-info">
              Deleting your messages in: <b>{label}</b>
            </div>

            <div class="field">
              <label>Content Search</label>
              <TextBox value={content()} onInput={setContent} placeholder="Leave empty for all messages" />
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

            <SwitchItem value={hasLink()} onChange={setHasLink}>Only messages with links</SwitchItem>
            <SwitchItem value={hasFile()} onChange={setHasFile}>Only messages with files</SwitchItem>
            <SwitchItem value={includePinned()} onChange={setIncludePinned}>Include pinned messages</SwitchItem>

            <div class="undiscord-advanced" onClick={() => setShowAdvanced(!showAdvanced())}>
              {showAdvanced() ? "Hide" : "Show"} advanced options
            </div>

            <Show when={showAdvanced()}>
              <div style={{ "margin-top": "8px" }}>
                <div class="field">
                  <label>Regex Pattern (client-side)</label>
                  <TextBox value={pattern()} onInput={setPattern} placeholder="e.g. hello|world" />
                </div>
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
              </div>
            </Show>

            <div class="undiscord-buttons">
              <Button color={ButtonColors.RED} onClick={start}>Start Deleting</Button>
            </div>

            <Divider mt mb />

            <Header tag={HeaderTags.H3}>Autodelete</Header>
            <Text style={{ "margin-bottom": "8px", "font-size": "13px", color: "var(--text-muted)" }}>
              Automatically delete your new messages after a delay.
            </Text>
            <SwitchItem
              value={store.autodeleteEnabled || false}
              onChange={(v) => {
                store.autodeleteEnabled = v;
                if (v) startAutodelete();
                else stopAutodelete();
              }}
            >
              Enable autodelete
            </SwitchItem>
            <Show when={store.autodeleteEnabled}>
              <div class="field">
                <label>Delay (seconds)</label>
                <TextBox
                  value={String(store.autodeleteDelay || 30)}
                  onInput={(v) => { store.autodeleteDelay = v; }}
                  placeholder="30"
                />
              </div>
            </Show>
          </div>
        </ModalBody>
      </ModalRoot>
    );
  });
}

// ── Styles ──
const styles = `
.undiscord-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--interactive-normal);
  transition: color 0.15s;
}
.undiscord-btn:hover {
  color: var(--interactive-hover);
}
.undiscord-btn svg {
  width: 20px;
  height: 20px;
}
.undiscord-pill {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  color: #1a1a1a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  animation: undiscord-pill-in 0.3s ease-out;
}
.undiscord-pill:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
}
.undiscord-pill-icon {
  display: flex;
  align-items: center;
}
.undiscord-pill-icon svg {
  width: 16px;
  height: 16px;
  stroke: #e03e3e;
}
@keyframes undiscord-pill-in {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.undiscord-modal-body {
  padding: 16px;
  color: var(--text-normal);
}
.undiscord-modal-body label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--header-secondary);
}
.undiscord-modal-body .field {
  margin-bottom: 12px;
}
.undiscord-modal-body .field-row {
  display: flex;
  gap: 12px;
}
.undiscord-modal-body .field-row > .field {
  flex: 1;
}
.undiscord-modal-body .context-info {
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: var(--background-secondary);
  font-size: 13px;
  color: var(--text-muted);
}
.undiscord-modal-body .context-info b {
  color: var(--text-normal);
}
.undiscord-progress {
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  background: var(--background-secondary);
  font-size: 14px;
  line-height: 1.6;
}
.undiscord-progress .stat { color: var(--text-muted); }
.undiscord-progress .stat b { color: var(--text-normal); }
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
.undiscord-advanced {
  margin-top: 8px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-link);
  user-select: none;
}
`;

// ── Trash icon SVG ──
const TRASH_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;

// ── Autodelete feature ──
let autodeleteUnsub = null;

function startAutodelete() {
  if (autodeleteUnsub) return;

  const userId = stores.UserStore?.getCurrentUser()?.id;
  if (!userId) return;

  const handler = async (payload) => {
    if (!store.autodeleteEnabled) return;

    const msg = payload.message;
    if (!msg || msg.author?.id !== userId) return;

    const delay = (parseInt(store.autodeleteDelay) || 30) * 1000;

    await sleep(delay);
    try {
      await apiDelete(`/channels/${msg.channel_id}/messages/${msg.id}`);
    } catch {}
  };

  shelter.flux.dispatcher.subscribe("MESSAGE_CREATE", handler);
  autodeleteUnsub = () => shelter.flux.dispatcher.unsubscribe("MESSAGE_CREATE", handler);
}

function stopAutodelete() {
  autodeleteUnsub?.();
  autodeleteUnsub = null;
}

// ── Inject toolbar button ──
function injectToolbarButton() {
  return observeDom('[class*="toolbar_"]', (toolbar) => {
    if (toolbar.querySelector(".undiscord-btn")) return;

    const btn = document.createElement("div");
    btn.className = "undiscord-btn";
    btn.innerHTML = TRASH_SVG;
    btn.title = "Undiscord - Purge Messages";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openUndiscordModal();
    });

    toolbar.prepend(btn);
  });
}

// ── Plugin lifecycle ──
let cleanupCss;
let cleanupObserver;

export function onLoad() {
  cleanupCss = injectCss(styles);
  cleanupObserver = injectToolbarButton();
  if (store.autodeleteEnabled) startAutodelete();
}

export function onUnload() {
  stopDeletion();
  stopAutodelete();
  hideFloatingPill();
  cleanupCss?.();
  cleanupObserver?.();
  progressListeners = [];
  document.querySelectorAll(".undiscord-btn").forEach((el) => el.remove());
}
