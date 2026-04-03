(function(exports) {

//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function() {
	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion

//#region solid-js/web
var require_web = __commonJS({ "solid-js/web"(exports, module) {
	module.exports = shelter.solidWeb;
} });

//#endregion
//#region plugins/undiscord/index.jsx
var import_web = __toESM(require_web(), 1);
var import_web$1 = __toESM(require_web(), 1);
var import_web$2 = __toESM(require_web(), 1);
var import_web$3 = __toESM(require_web(), 1);
var import_web$4 = __toESM(require_web(), 1);
const _tmpl$ = /*#__PURE__*/ (0, import_web.template)(`<div class="current-msg">Current: <!#><!/>...</div>`, 4), _tmpl$2 = /*#__PURE__*/ (0, import_web.template)(`<div>Error: <!#><!/></div>`, 4), _tmpl$3 = /*#__PURE__*/ (0, import_web.template)(`<div class="undiscord-progress"><div class="stat">Status: <b></b></div><div class="stat">Deleted: <b></b> | Skipped: <b></b> | Failed: <b></b></div><div class="stat">Estimated total: <b></b></div><!#><!/><!#><!/></div>`, 22), _tmpl$4 = /*#__PURE__*/ (0, import_web.template)(`<div class="undiscord-panel"><!#><!/><!#><!/><!#><!/><div class="field-row"><div class="field"><label>Guild / Server ID</label><!#><!/></div><div class="field"><label>Channel ID</label><!#><!/></div></div><div></div><div class="field-row"><div class="field"><label>After Date</label><!#><!/></div><div class="field"><label>Before Date</label><!#><!/></div></div><div class="field"><label>Content Search (server-side)</label><!#><!/></div><div class="field"><label>Regex Pattern (client-side filter)</label><!#><!/></div><!#><!/><!#><!/><!#><!/><!#><!/><!#><!/><div class="field-row"><div class="field"><label>Search Delay (ms)</label><!#><!/></div><div class="field"><label>Delete Delay (ms)</label><!#><!/></div></div><div class="undiscord-buttons"><!#><!/><!#><!/></div><!#><!/></div>`, 82);
const { flux: { stores }, plugin: { store, scoped }, settings: { registerSection }, ui: { Header, HeaderTags, Text, TextBox, Button, ButtonColors, ButtonSizes, SwitchItem, Divider, showToast, openModal, ModalRoot, ModalHeader, ModalBody, ModalFooter, injectCss }, solid: { createSignal, createEffect, onCleanup, Show } } = shelter;
const DISCORD_EPOCH = 1420070400000n;
function dateToSnowflake(dateStr) {
	const ts = new Date(dateStr).getTime();
	if (isNaN(ts)) return null;
	return String(BigInt(ts) - DISCORD_EPOCH << 22n);
}
async function discordFetch(url, options = {}) {
	const token = getToken();
	if (!token) throw new Error("Could not retrieve auth token");
	const resp = await fetch(`https://discord.com/api/v9${url}`, {
		...options,
		headers: {
			Authorization: token,
			"Content-Type": "application/json",
			...options.headers
		}
	});
	if (resp.status === 429) {
		const data = await resp.json();
		const retryAfter = (data.retry_after || 1) * 1e3;
		await sleep(retryAfter * 2);
		return discordFetch(url, options);
	}
	if (resp.status === 202) {
		const data = await resp.json();
		const retryAfter = (data.retry_after || 2) * 1e3;
		await sleep(retryAfter);
		return discordFetch(url, options);
	}
	return resp;
}
function getToken() {
	try {
		const mods = webpackChunkdiscord_app.push([
			[Symbol()],
			{},
			(r) => {
				const cache = r.c;
				webpackChunkdiscord_app.pop();
				return cache;
			}
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
	const base = guildId === "@me" ? `/channels/${channelId}/messages/search` : `/guilds/${guildId}/messages/search`;
	const resp = await discordFetch(`${base}?${params.toString()}`);
	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`Search failed (${resp.status}): ${text}`);
	}
	return resp.json();
}
async function deleteMessage(channelId, messageId) {
	const resp = await discordFetch(`/channels/${channelId}/messages/${messageId}`, { method: "DELETE" });
	if (resp.status === 204) return "OK";
	if (resp.status === 404) return "SKIP";
	if (resp.status === 403) return "FORBIDDEN";
	const text = await resp.text();
	throw new Error(`Delete failed (${resp.status}): ${text}`);
}
let running = false;
let stopRequested = false;
async function runDeletion(config, onProgress) {
	running = true;
	stopRequested = false;
	const { guildId, channelId, authorId, beforeDate, afterDate, content, hasLink, hasFile, includeNsfw, includePinned, pattern, searchDelay, deleteDelay } = config;
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
			onProgress({
				status: "searching",
				deleted,
				skipped,
				failed,
				totalEstimate
			});
			const data = await searchMessages(guildId, channelId, userId, {
				minId,
				maxId,
				content,
				hasLink,
				hasFile,
				includeNsfw,
				offset
			});
			totalEstimate = data.total_results || 0;
			if (!data.messages || data.messages.length === 0) break;
			const hits = data.messages.flat().filter((m) => m.hit);
			if (hits.length === 0) break;
			let pageSkipped = 0;
			for (const msg of hits) {
				if (stopRequested) break;
				const t = msg.type;
				if (t !== 0 && (t < 6 || t > 21)) {
					pageSkipped++;
					skipped++;
					continue;
				}
				if (msg.pinned && !includePinned) {
					pageSkipped++;
					skipped++;
					continue;
				}
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
					currentMessage: msg.content?.substring(0, 80)
				});
				const result = await deleteMessage(msg.channel_id, msg.id);
				if (result === "OK") deleted++;
else if (result === "SKIP") {
					skipped++;
					pageSkipped++;
				} else if (result === "FORBIDDEN") {
					failed++;
					pageSkipped++;
				}
				await sleep(deleteDelay);
			}
			if (pageSkipped === hits.length) offset += pageSkipped;
else offset = 0;
			await sleep(searchDelay);
		}
	} catch (err) {
		onProgress({
			status: "error",
			deleted,
			skipped,
			failed,
			totalEstimate,
			error: err.message
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
		totalEstimate
	});
}
function stopDeletion() {
	stopRequested = true;
}
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
			showToast({
				title: "Undiscord",
				content: "Enter a Guild ID or Channel ID",
				duration: 3e3
			});
			return;
		}
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
		setProgress({
			status: "starting",
			deleted: 0,
			skipped: 0,
			failed: 0,
			totalEstimate: 0
		});
		runDeletion({
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
			deleteDelay: parseInt(deleteDelay()) || 800
		}, (p) => {
			setProgress({ ...p });
			if (p.status === "done" || p.status === "error") setIsRunning(false);
		});
	};
	const stop = () => {
		stopDeletion();
		setIsRunning(false);
	};
	return (() => {
		const _el$ = (0, import_web$1.getNextElement)(_tmpl$4), _el$68 = _el$.firstChild, [_el$69, _co$13] = (0, import_web$2.getNextMarker)(_el$68.nextSibling), _el$70 = _el$69.nextSibling, [_el$71, _co$14] = (0, import_web$2.getNextMarker)(_el$70.nextSibling), _el$72 = _el$71.nextSibling, [_el$73, _co$15] = (0, import_web$2.getNextMarker)(_el$72.nextSibling), _el$2 = _el$73.nextSibling, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, [_el$6, _co$] = (0, import_web$2.getNextMarker)(_el$5.nextSibling), _el$7 = _el$3.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling, [_el$0, _co$2] = (0, import_web$2.getNextMarker)(_el$9.nextSibling), _el$1 = _el$2.nextSibling, _el$10 = _el$1.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling, [_el$14, _co$3] = (0, import_web$2.getNextMarker)(_el$13.nextSibling), _el$15 = _el$11.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, [_el$18, _co$4] = (0, import_web$2.getNextMarker)(_el$17.nextSibling), _el$19 = _el$10.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, [_el$22, _co$5] = (0, import_web$2.getNextMarker)(_el$21.nextSibling), _el$23 = _el$19.nextSibling, _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling, [_el$26, _co$6] = (0, import_web$2.getNextMarker)(_el$25.nextSibling), _el$74 = _el$23.nextSibling, [_el$75, _co$16] = (0, import_web$2.getNextMarker)(_el$74.nextSibling), _el$76 = _el$75.nextSibling, [_el$77, _co$17] = (0, import_web$2.getNextMarker)(_el$76.nextSibling), _el$78 = _el$77.nextSibling, [_el$79, _co$18] = (0, import_web$2.getNextMarker)(_el$78.nextSibling), _el$80 = _el$79.nextSibling, [_el$81, _co$19] = (0, import_web$2.getNextMarker)(_el$80.nextSibling), _el$82 = _el$81.nextSibling, [_el$83, _co$20] = (0, import_web$2.getNextMarker)(_el$82.nextSibling), _el$27 = _el$83.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, [_el$31, _co$7] = (0, import_web$2.getNextMarker)(_el$30.nextSibling), _el$32 = _el$28.nextSibling, _el$33 = _el$32.firstChild, _el$34 = _el$33.nextSibling, [_el$35, _co$8] = (0, import_web$2.getNextMarker)(_el$34.nextSibling), _el$36 = _el$27.nextSibling, _el$37 = _el$36.firstChild, [_el$38, _co$9] = (0, import_web$2.getNextMarker)(_el$37.nextSibling), _el$39 = _el$38.nextSibling, [_el$40, _co$0] = (0, import_web$2.getNextMarker)(_el$39.nextSibling), _el$84 = _el$36.nextSibling, [_el$85, _co$21] = (0, import_web$2.getNextMarker)(_el$84.nextSibling);
		(0, import_web$3.insert)(_el$, (0, import_web$4.createComponent)(Header, {
			get tag() {
				return HeaderTags.H1;
			},
			children: "Undiscord"
		}), _el$69, _co$13);
		(0, import_web$3.insert)(_el$, (0, import_web$4.createComponent)(Text, { children: "Mass delete your own messages. Use Developer Mode to copy IDs." }), _el$71, _co$14);
		(0, import_web$3.insert)(_el$, (0, import_web$4.createComponent)(Divider, {
			mt: true,
			mb: true
		}), _el$73, _co$15);
		(0, import_web$3.insert)(_el$3, (0, import_web$4.createComponent)(TextBox, {
			get value() {
				return guildId();
			},
			onInput: setGuildId,
			placeholder: "@me for DMs"
		}), _el$6, _co$);
		(0, import_web$3.insert)(_el$7, (0, import_web$4.createComponent)(TextBox, {
			get value() {
				return channelId();
			},
			onInput: setChannelId,
			placeholder: "Optional for guilds"
		}), _el$0, _co$2);
		_el$1.style.setProperty("margin-bottom", "12px");
		(0, import_web$3.insert)(_el$1, (0, import_web$4.createComponent)(Button, {
			get size() {
				return ButtonSizes.SMALL;
			},
			onClick: fillCurrent,
			children: "Fill Current Channel"
		}));
		(0, import_web$3.insert)(_el$11, (0, import_web$4.createComponent)(TextBox, {
			get value() {
				return afterDate();
			},
			onInput: setAfterDate,
			placeholder: "YYYY-MM-DD"
		}), _el$14, _co$3);
		(0, import_web$3.insert)(_el$15, (0, import_web$4.createComponent)(TextBox, {
			get value() {
				return beforeDate();
			},
			onInput: setBeforeDate,
			placeholder: "YYYY-MM-DD"
		}), _el$18, _co$4);
		(0, import_web$3.insert)(_el$19, (0, import_web$4.createComponent)(TextBox, {
			get value() {
				return content();
			},
			onInput: setContent,
			placeholder: "Search text"
		}), _el$22, _co$5);
		(0, import_web$3.insert)(_el$23, (0, import_web$4.createComponent)(TextBox, {
			get value() {
				return pattern();
			},
			onInput: setPattern,
			placeholder: "e.g. hello|world"
		}), _el$26, _co$6);
		(0, import_web$3.insert)(_el$, (0, import_web$4.createComponent)(SwitchItem, {
			get value() {
				return hasLink();
			},
			onChange: setHasLink,
			children: "Only messages with links"
		}), _el$75, _co$16);
		(0, import_web$3.insert)(_el$, (0, import_web$4.createComponent)(SwitchItem, {
			get value() {
				return hasFile();
			},
			onChange: setHasFile,
			children: "Only messages with files"
		}), _el$77, _co$17);
		(0, import_web$3.insert)(_el$, (0, import_web$4.createComponent)(SwitchItem, {
			get value() {
				return includeNsfw();
			},
			onChange: setIncludeNsfw,
			children: "Include NSFW channels"
		}), _el$79, _co$18);
		(0, import_web$3.insert)(_el$, (0, import_web$4.createComponent)(SwitchItem, {
			get value() {
				return includePinned();
			},
			onChange: setIncludePinned,
			children: "Delete pinned messages"
		}), _el$81, _co$19);
		(0, import_web$3.insert)(_el$, (0, import_web$4.createComponent)(Divider, {
			mt: true,
			mb: true
		}), _el$83, _co$20);
		(0, import_web$3.insert)(_el$28, (0, import_web$4.createComponent)(TextBox, {
			get value() {
				return searchDelay();
			},
			onInput: setSearchDelay,
			placeholder: "1500"
		}), _el$31, _co$7);
		(0, import_web$3.insert)(_el$32, (0, import_web$4.createComponent)(TextBox, {
			get value() {
				return deleteDelay();
			},
			onInput: setDeleteDelay,
			placeholder: "800"
		}), _el$35, _co$8);
		(0, import_web$3.insert)(_el$36, (0, import_web$4.createComponent)(Show, {
			get when() {
				return !isRunning();
			},
			get children() {
				return (0, import_web$4.createComponent)(Button, {
					get color() {
						return ButtonColors.RED;
					},
					onClick: start,
					children: "Start Deleting"
				});
			}
		}), _el$38, _co$9);
		(0, import_web$3.insert)(_el$36, (0, import_web$4.createComponent)(Show, {
			get when() {
				return isRunning();
			},
			get children() {
				return (0, import_web$4.createComponent)(Button, {
					get color() {
						return ButtonColors.PRIMARY;
					},
					onClick: stop,
					children: "Stop"
				});
			}
		}), _el$40, _co$0);
		(0, import_web$3.insert)(_el$, (0, import_web$4.createComponent)(Show, {
			get when() {
				return progress();
			},
			get children() {
				const _el$41 = (0, import_web$1.getNextElement)(_tmpl$3), _el$42 = _el$41.firstChild, _el$43 = _el$42.firstChild, _el$44 = _el$43.nextSibling, _el$45 = _el$42.nextSibling, _el$46 = _el$45.firstChild, _el$47 = _el$46.nextSibling, _el$48 = _el$47.nextSibling, _el$49 = _el$48.nextSibling, _el$50 = _el$49.nextSibling, _el$51 = _el$50.nextSibling, _el$52 = _el$45.nextSibling, _el$53 = _el$52.firstChild, _el$54 = _el$53.nextSibling, _el$64 = _el$52.nextSibling, [_el$65, _co$11] = (0, import_web$2.getNextMarker)(_el$64.nextSibling), _el$66 = _el$65.nextSibling, [_el$67, _co$12] = (0, import_web$2.getNextMarker)(_el$66.nextSibling);
				(0, import_web$3.insert)(_el$44, () => progress().status);
				(0, import_web$3.insert)(_el$47, () => progress().deleted);
				(0, import_web$3.insert)(_el$49, () => progress().skipped);
				(0, import_web$3.insert)(_el$51, () => progress().failed);
				(0, import_web$3.insert)(_el$54, () => progress().totalEstimate);
				(0, import_web$3.insert)(_el$41, (0, import_web$4.createComponent)(Show, {
					get when() {
						return progress().currentMessage;
					},
					get children() {
						const _el$55 = (0, import_web$1.getNextElement)(_tmpl$), _el$56 = _el$55.firstChild, _el$58 = _el$56.nextSibling, [_el$59, _co$1] = (0, import_web$2.getNextMarker)(_el$58.nextSibling), _el$57 = _el$59.nextSibling;
						(0, import_web$3.insert)(_el$55, () => progress().currentMessage, _el$59, _co$1);
						return _el$55;
					}
				}), _el$65, _co$11);
				(0, import_web$3.insert)(_el$41, (0, import_web$4.createComponent)(Show, {
					get when() {
						return progress().error;
					},
					get children() {
						const _el$60 = (0, import_web$1.getNextElement)(_tmpl$2), _el$61 = _el$60.firstChild, _el$62 = _el$61.nextSibling, [_el$63, _co$10] = (0, import_web$2.getNextMarker)(_el$62.nextSibling);
						_el$60.style.setProperty("color", "var(--text-danger)");
						_el$60.style.setProperty("margin-top", "6px");
						(0, import_web$3.insert)(_el$60, () => progress().error, _el$63, _co$10);
						return _el$60;
					}
				}), _el$67, _co$12);
				return _el$41;
			}
		}), _el$85, _co$21);
		return _el$;
	})();
}
let cleanupCss;
let cleanupSection;
function onLoad() {
	cleanupCss = injectCss(styles);
	cleanupSection = registerSection("section", "undiscord", "Undiscord", UndiscordPanel);
}
function onUnload() {
	stopDeletion();
	cleanupCss?.();
	cleanupSection?.();
}

//#endregion
exports.onLoad = onLoad
exports.onUnload = onUnload
return exports;
})({});