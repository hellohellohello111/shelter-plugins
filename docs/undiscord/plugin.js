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
var import_web$5 = __toESM(require_web(), 1);
var import_web$6 = __toESM(require_web(), 1);
var import_web$7 = __toESM(require_web(), 1);
const _tmpl$ = /*#__PURE__*/ (0, import_web.template)(`<div><div class="field"><label>Regex Pattern (client-side)</label><!#><!/></div><div class="field-row"><div class="field"><label>Search Delay (ms)</label><!#><!/></div><div class="field"><label>Delete Delay (ms)</label><!#><!/></div></div></div>`, 22), _tmpl$2 = /*#__PURE__*/ (0, import_web.template)(`<div class="current-msg">Current: <!#><!/>...</div>`, 4), _tmpl$3 = /*#__PURE__*/ (0, import_web.template)(`<div>Error: <!#><!/></div>`, 4), _tmpl$4 = /*#__PURE__*/ (0, import_web.template)(`<div class="undiscord-progress"><div class="stat">Status: <b></b></div><div class="stat">Deleted: <b></b> | Skipped: <b></b> | Failed: <b></b></div><div class="stat">Estimated total: <b></b></div><!#><!/><!#><!/></div>`, 22), _tmpl$5 = /*#__PURE__*/ (0, import_web.template)(`<div class="undiscord-modal-body"><div class="context-info">Deleting your messages in: <b></b></div><div class="field"><label>Content Search</label><!#><!/></div><div class="field-row"><div class="field"><label>After Date</label><!#><!/></div><div class="field"><label>Before Date</label><!#><!/></div></div><!#><!/><!#><!/><!#><!/><div class="undiscord-advanced"><!#><!/> advanced options</div><!#><!/><div class="undiscord-buttons"><!#><!/><!#><!/></div><!#><!/></div>`, 46), _tmpl$6 = /*#__PURE__*/ (0, import_web.template)(`<div class="undiscord-modal-body"><!#><!/><!#><!/><!#><!/><div class="field-row"><div class="field"><label>Guild / Server ID</label><!#><!/></div><div class="field"><label>Channel ID</label><!#><!/></div></div><div></div><div class="field-row"><div class="field"><label>After Date</label><!#><!/></div><div class="field"><label>Before Date</label><!#><!/></div></div><div class="field"><label>Content Search</label><!#><!/></div><div class="field"><label>Regex Pattern</label><!#><!/></div><!#><!/><!#><!/><!#><!/><!#><!/><!#><!/><div class="field-row"><div class="field"><label>Search Delay (ms)</label><!#><!/></div><div class="field"><label>Delete Delay (ms)</label><!#><!/></div></div><div class="undiscord-buttons"><!#><!/><!#><!/></div><!#><!/></div>`, 82);
const { flux: { stores }, http, plugin: { store, scoped }, settings: { registerSection }, observeDom, ui: { Header, HeaderTags, Text, TextBox, Button, ButtonColors, ButtonSizes, SwitchItem, Divider, showToast, openModal, ModalRoot, ModalHeader, ModalBody, ModalFooter, injectCss }, solid: { createSignal, Show } } = shelter;
const DISCORD_EPOCH = 1420070400000n;
function dateToSnowflake(dateStr) {
	const ts = new Date(dateStr).getTime();
	if (isNaN(ts)) return null;
	return String(BigInt(ts) - DISCORD_EPOCH << 22n);
}
async function apiGet(url, retries = 3) {
	const resp = await http.get({ url });
	if (resp.status === 429) {
		const retryAfter = (resp.body?.retry_after || 1) * 1e3;
		await sleep(retryAfter * 2);
		return apiGet(url, retries - 1);
	}
	if (resp.status === 202) {
		const retryAfter = (resp.body?.retry_after || 2) * 1e3;
		await sleep(retryAfter);
		return apiGet(url, retries - 1);
	}
	return resp;
}
async function apiDelete(url, retries = 3) {
	const resp = await http.del({ url });
	if (resp.status === 429 && retries > 0) {
		const retryAfter = (resp.body?.retry_after || 1) * 1e3;
		await sleep(retryAfter * 2);
		return apiDelete(url, retries - 1);
	}
	return resp;
}
function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}
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
	const base = guildId === "@me" ? `/channels/${channelId}/messages/search` : `/guilds/${guildId}/messages/search`;
	const resp = await apiGet(`${base}?${params.toString()}`);
	if (!resp.ok) throw new Error(`Search failed (${resp.status}): ${JSON.stringify(resp.body)}`);
	return resp.body;
}
async function deleteMessage(channelId, messageId) {
	const resp = await apiDelete(`/channels/${channelId}/messages/${messageId}`);
	if (resp.status === 204) return "OK";
	if (resp.status === 404) return "SKIP";
	if (resp.status === 403) return "FORBIDDEN";
	throw new Error(`Delete failed (${resp.status}): ${JSON.stringify(resp.body)}`);
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
	let deleted = 0, skipped = 0, failed = 0, offset = 0, totalEstimate = 0;
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
	return {
		guildId,
		channelId,
		channelName,
		guildName
	};
}
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
const TRASH_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
function openUndiscordModal() {
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
		const [isRunning, setIsRunning] = createSignal(false);
		const [progress, setProgress] = createSignal(null);
		const start = () => {
			if (isRunning()) return;
			setIsRunning(true);
			setProgress({
				status: "starting",
				deleted: 0,
				skipped: 0,
				failed: 0,
				totalEstimate: 0
			});
			runDeletion({
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
		const label = ctx.guildId === "@me" ? `DM: ${ctx.channelName || ctx.channelId}` : `#${ctx.channelName || ctx.channelId} in ${ctx.guildName || ctx.guildId}`;
		return (0, import_web$7.createComponent)(ModalRoot, { get children() {
			return [(0, import_web$7.createComponent)(ModalHeader, {
				get close() {
					return mprops.close;
				},
				children: "Undiscord - Purge Messages"
			}), (0, import_web$7.createComponent)(ModalBody, { get children() {
				const _el$ = (0, import_web$3.getNextElement)(_tmpl$5), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$2.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling, [_el$8, _co$] = (0, import_web$5.getNextMarker)(_el$7.nextSibling), _el$9 = _el$5.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling, [_el$11, _co$2] = (0, import_web$5.getNextMarker)(_el$10.nextSibling), _el$12 = _el$0.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, [_el$15, _co$3] = (0, import_web$5.getNextMarker)(_el$14.nextSibling), _el$66 = _el$9.nextSibling, [_el$67, _co$12] = (0, import_web$5.getNextMarker)(_el$66.nextSibling), _el$68 = _el$67.nextSibling, [_el$69, _co$13] = (0, import_web$5.getNextMarker)(_el$68.nextSibling), _el$70 = _el$69.nextSibling, [_el$71, _co$14] = (0, import_web$5.getNextMarker)(_el$70.nextSibling), _el$16 = _el$71.nextSibling, _el$18 = _el$16.firstChild, [_el$19, _co$4] = (0, import_web$5.getNextMarker)(_el$18.nextSibling), _el$17 = _el$19.nextSibling, _el$72 = _el$16.nextSibling, [_el$73, _co$15] = (0, import_web$5.getNextMarker)(_el$72.nextSibling), _el$34 = _el$73.nextSibling, _el$35 = _el$34.firstChild, [_el$36, _co$8] = (0, import_web$5.getNextMarker)(_el$35.nextSibling), _el$37 = _el$36.nextSibling, [_el$38, _co$9] = (0, import_web$5.getNextMarker)(_el$37.nextSibling), _el$74 = _el$34.nextSibling, [_el$75, _co$16] = (0, import_web$5.getNextMarker)(_el$74.nextSibling);
				(0, import_web$6.insert)(_el$4, label);
				(0, import_web$6.insert)(_el$5, (0, import_web$7.createComponent)(TextBox, {
					get value() {
						return content();
					},
					onInput: setContent,
					placeholder: "Leave empty for all messages"
				}), _el$8, _co$);
				(0, import_web$6.insert)(_el$0, (0, import_web$7.createComponent)(TextBox, {
					get value() {
						return afterDate();
					},
					onInput: setAfterDate,
					placeholder: "YYYY-MM-DD"
				}), _el$11, _co$2);
				(0, import_web$6.insert)(_el$12, (0, import_web$7.createComponent)(TextBox, {
					get value() {
						return beforeDate();
					},
					onInput: setBeforeDate,
					placeholder: "YYYY-MM-DD"
				}), _el$15, _co$3);
				(0, import_web$6.insert)(_el$, (0, import_web$7.createComponent)(SwitchItem, {
					get value() {
						return hasLink();
					},
					onChange: setHasLink,
					children: "Only messages with links"
				}), _el$67, _co$12);
				(0, import_web$6.insert)(_el$, (0, import_web$7.createComponent)(SwitchItem, {
					get value() {
						return hasFile();
					},
					onChange: setHasFile,
					children: "Only messages with files"
				}), _el$69, _co$13);
				(0, import_web$6.insert)(_el$, (0, import_web$7.createComponent)(SwitchItem, {
					get value() {
						return includePinned();
					},
					onChange: setIncludePinned,
					children: "Include pinned messages"
				}), _el$71, _co$14);
				_el$16.$$click = () => setShowAdvanced(!showAdvanced());
				(0, import_web$6.insert)(_el$16, () => showAdvanced() ? "Hide" : "Show", _el$19, _co$4);
				(0, import_web$6.insert)(_el$, (0, import_web$7.createComponent)(Show, {
					get when() {
						return showAdvanced();
					},
					get children() {
						const _el$20 = (0, import_web$3.getNextElement)(_tmpl$), _el$21 = _el$20.firstChild, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, [_el$24, _co$5] = (0, import_web$5.getNextMarker)(_el$23.nextSibling), _el$25 = _el$21.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.firstChild, _el$28 = _el$27.nextSibling, [_el$29, _co$6] = (0, import_web$5.getNextMarker)(_el$28.nextSibling), _el$30 = _el$26.nextSibling, _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling, [_el$33, _co$7] = (0, import_web$5.getNextMarker)(_el$32.nextSibling);
						_el$20.style.setProperty("margin-top", "8px");
						(0, import_web$6.insert)(_el$21, (0, import_web$7.createComponent)(TextBox, {
							get value() {
								return pattern();
							},
							onInput: setPattern,
							placeholder: "e.g. hello|world"
						}), _el$24, _co$5);
						(0, import_web$6.insert)(_el$26, (0, import_web$7.createComponent)(TextBox, {
							get value() {
								return searchDelay();
							},
							onInput: setSearchDelay,
							placeholder: "1500"
						}), _el$29, _co$6);
						(0, import_web$6.insert)(_el$30, (0, import_web$7.createComponent)(TextBox, {
							get value() {
								return deleteDelay();
							},
							onInput: setDeleteDelay,
							placeholder: "800"
						}), _el$33, _co$7);
						return _el$20;
					}
				}), _el$73, _co$15);
				(0, import_web$6.insert)(_el$34, (0, import_web$7.createComponent)(Show, {
					get when() {
						return !isRunning();
					},
					get children() {
						return (0, import_web$7.createComponent)(Button, {
							get color() {
								return ButtonColors.RED;
							},
							onClick: start,
							children: "Start Deleting"
						});
					}
				}), _el$36, _co$8);
				(0, import_web$6.insert)(_el$34, (0, import_web$7.createComponent)(Show, {
					get when() {
						return isRunning();
					},
					get children() {
						return (0, import_web$7.createComponent)(Button, {
							get color() {
								return ButtonColors.PRIMARY;
							},
							onClick: stop,
							children: "Stop"
						});
					}
				}), _el$38, _co$9);
				(0, import_web$6.insert)(_el$, (0, import_web$7.createComponent)(Show, {
					get when() {
						return progress();
					},
					get children() {
						const _el$39 = (0, import_web$3.getNextElement)(_tmpl$4), _el$40 = _el$39.firstChild, _el$41 = _el$40.firstChild, _el$42 = _el$41.nextSibling, _el$43 = _el$40.nextSibling, _el$44 = _el$43.firstChild, _el$45 = _el$44.nextSibling, _el$46 = _el$45.nextSibling, _el$47 = _el$46.nextSibling, _el$48 = _el$47.nextSibling, _el$49 = _el$48.nextSibling, _el$50 = _el$43.nextSibling, _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling, _el$62 = _el$50.nextSibling, [_el$63, _co$10] = (0, import_web$5.getNextMarker)(_el$62.nextSibling), _el$64 = _el$63.nextSibling, [_el$65, _co$11] = (0, import_web$5.getNextMarker)(_el$64.nextSibling);
						(0, import_web$6.insert)(_el$42, () => progress().status);
						(0, import_web$6.insert)(_el$45, () => progress().deleted);
						(0, import_web$6.insert)(_el$47, () => progress().skipped);
						(0, import_web$6.insert)(_el$49, () => progress().failed);
						(0, import_web$6.insert)(_el$52, () => progress().totalEstimate);
						(0, import_web$6.insert)(_el$39, (0, import_web$7.createComponent)(Show, {
							get when() {
								return progress().currentMessage;
							},
							get children() {
								const _el$53 = (0, import_web$3.getNextElement)(_tmpl$2), _el$54 = _el$53.firstChild, _el$56 = _el$54.nextSibling, [_el$57, _co$0] = (0, import_web$5.getNextMarker)(_el$56.nextSibling), _el$55 = _el$57.nextSibling;
								(0, import_web$6.insert)(_el$53, () => progress().currentMessage, _el$57, _co$0);
								return _el$53;
							}
						}), _el$63, _co$10);
						(0, import_web$6.insert)(_el$39, (0, import_web$7.createComponent)(Show, {
							get when() {
								return progress().error;
							},
							get children() {
								const _el$58 = (0, import_web$3.getNextElement)(_tmpl$3), _el$59 = _el$58.firstChild, _el$60 = _el$59.nextSibling, [_el$61, _co$1] = (0, import_web$5.getNextMarker)(_el$60.nextSibling);
								_el$58.style.setProperty("color", "var(--text-danger)");
								_el$58.style.setProperty("margin-top", "6px");
								(0, import_web$6.insert)(_el$58, () => progress().error, _el$61, _co$1);
								return _el$58;
							}
						}), _el$65, _co$11);
						return _el$39;
					}
				}), _el$75, _co$16);
				(0, import_web$2.runHydrationEvents)();
				return _el$;
			} })];
		} });
	});
}
function injectToolbarButton() {
	return observeDom("[class*=\"toolbar_\"]", (toolbar) => {
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
		const ctx = getCurrentContext();
		setGuildId(ctx.guildId);
		if (ctx.channelId) setChannelId(ctx.channelId);
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
		const _el$76 = (0, import_web$3.getNextElement)(_tmpl$6), _el$145 = _el$76.firstChild, [_el$146, _co$31] = (0, import_web$5.getNextMarker)(_el$145.nextSibling), _el$147 = _el$146.nextSibling, [_el$148, _co$32] = (0, import_web$5.getNextMarker)(_el$147.nextSibling), _el$149 = _el$148.nextSibling, [_el$150, _co$33] = (0, import_web$5.getNextMarker)(_el$149.nextSibling), _el$77 = _el$150.nextSibling, _el$78 = _el$77.firstChild, _el$79 = _el$78.firstChild, _el$80 = _el$79.nextSibling, [_el$81, _co$17] = (0, import_web$5.getNextMarker)(_el$80.nextSibling), _el$82 = _el$78.nextSibling, _el$83 = _el$82.firstChild, _el$84 = _el$83.nextSibling, [_el$85, _co$18] = (0, import_web$5.getNextMarker)(_el$84.nextSibling), _el$86 = _el$77.nextSibling, _el$87 = _el$86.nextSibling, _el$88 = _el$87.firstChild, _el$89 = _el$88.firstChild, _el$90 = _el$89.nextSibling, [_el$91, _co$19] = (0, import_web$5.getNextMarker)(_el$90.nextSibling), _el$92 = _el$88.nextSibling, _el$93 = _el$92.firstChild, _el$94 = _el$93.nextSibling, [_el$95, _co$20] = (0, import_web$5.getNextMarker)(_el$94.nextSibling), _el$96 = _el$87.nextSibling, _el$97 = _el$96.firstChild, _el$98 = _el$97.nextSibling, [_el$99, _co$21] = (0, import_web$5.getNextMarker)(_el$98.nextSibling), _el$100 = _el$96.nextSibling, _el$101 = _el$100.firstChild, _el$102 = _el$101.nextSibling, [_el$103, _co$22] = (0, import_web$5.getNextMarker)(_el$102.nextSibling), _el$151 = _el$100.nextSibling, [_el$152, _co$34] = (0, import_web$5.getNextMarker)(_el$151.nextSibling), _el$153 = _el$152.nextSibling, [_el$154, _co$35] = (0, import_web$5.getNextMarker)(_el$153.nextSibling), _el$155 = _el$154.nextSibling, [_el$156, _co$36] = (0, import_web$5.getNextMarker)(_el$155.nextSibling), _el$157 = _el$156.nextSibling, [_el$158, _co$37] = (0, import_web$5.getNextMarker)(_el$157.nextSibling), _el$159 = _el$158.nextSibling, [_el$160, _co$38] = (0, import_web$5.getNextMarker)(_el$159.nextSibling), _el$104 = _el$160.nextSibling, _el$105 = _el$104.firstChild, _el$106 = _el$105.firstChild, _el$107 = _el$106.nextSibling, [_el$108, _co$23] = (0, import_web$5.getNextMarker)(_el$107.nextSibling), _el$109 = _el$105.nextSibling, _el$110 = _el$109.firstChild, _el$111 = _el$110.nextSibling, [_el$112, _co$24] = (0, import_web$5.getNextMarker)(_el$111.nextSibling), _el$113 = _el$104.nextSibling, _el$114 = _el$113.firstChild, [_el$115, _co$25] = (0, import_web$5.getNextMarker)(_el$114.nextSibling), _el$116 = _el$115.nextSibling, [_el$117, _co$26] = (0, import_web$5.getNextMarker)(_el$116.nextSibling), _el$161 = _el$113.nextSibling, [_el$162, _co$39] = (0, import_web$5.getNextMarker)(_el$161.nextSibling);
		(0, import_web$6.insert)(_el$76, (0, import_web$7.createComponent)(Header, {
			get tag() {
				return HeaderTags.H1;
			},
			children: "Undiscord"
		}), _el$146, _co$31);
		(0, import_web$6.insert)(_el$76, (0, import_web$7.createComponent)(Text, { children: "Mass delete your own messages. You can also use the trash icon in the channel toolbar." }), _el$148, _co$32);
		(0, import_web$6.insert)(_el$76, (0, import_web$7.createComponent)(Divider, {
			mt: true,
			mb: true
		}), _el$150, _co$33);
		(0, import_web$6.insert)(_el$78, (0, import_web$7.createComponent)(TextBox, {
			get value() {
				return guildId();
			},
			onInput: setGuildId,
			placeholder: "@me for DMs"
		}), _el$81, _co$17);
		(0, import_web$6.insert)(_el$82, (0, import_web$7.createComponent)(TextBox, {
			get value() {
				return channelId();
			},
			onInput: setChannelId,
			placeholder: "Optional for guilds"
		}), _el$85, _co$18);
		_el$86.style.setProperty("margin-bottom", "12px");
		(0, import_web$6.insert)(_el$86, (0, import_web$7.createComponent)(Button, {
			get size() {
				return ButtonSizes.SMALL;
			},
			onClick: fillCurrent,
			children: "Fill Current Channel"
		}));
		(0, import_web$6.insert)(_el$88, (0, import_web$7.createComponent)(TextBox, {
			get value() {
				return afterDate();
			},
			onInput: setAfterDate,
			placeholder: "YYYY-MM-DD"
		}), _el$91, _co$19);
		(0, import_web$6.insert)(_el$92, (0, import_web$7.createComponent)(TextBox, {
			get value() {
				return beforeDate();
			},
			onInput: setBeforeDate,
			placeholder: "YYYY-MM-DD"
		}), _el$95, _co$20);
		(0, import_web$6.insert)(_el$96, (0, import_web$7.createComponent)(TextBox, {
			get value() {
				return content();
			},
			onInput: setContent,
			placeholder: "Search text"
		}), _el$99, _co$21);
		(0, import_web$6.insert)(_el$100, (0, import_web$7.createComponent)(TextBox, {
			get value() {
				return pattern();
			},
			onInput: setPattern,
			placeholder: "e.g. hello|world"
		}), _el$103, _co$22);
		(0, import_web$6.insert)(_el$76, (0, import_web$7.createComponent)(SwitchItem, {
			get value() {
				return hasLink();
			},
			onChange: setHasLink,
			children: "Only messages with links"
		}), _el$152, _co$34);
		(0, import_web$6.insert)(_el$76, (0, import_web$7.createComponent)(SwitchItem, {
			get value() {
				return hasFile();
			},
			onChange: setHasFile,
			children: "Only messages with files"
		}), _el$154, _co$35);
		(0, import_web$6.insert)(_el$76, (0, import_web$7.createComponent)(SwitchItem, {
			get value() {
				return includeNsfw();
			},
			onChange: setIncludeNsfw,
			children: "Include NSFW channels"
		}), _el$156, _co$36);
		(0, import_web$6.insert)(_el$76, (0, import_web$7.createComponent)(SwitchItem, {
			get value() {
				return includePinned();
			},
			onChange: setIncludePinned,
			children: "Delete pinned messages"
		}), _el$158, _co$37);
		(0, import_web$6.insert)(_el$76, (0, import_web$7.createComponent)(Divider, {
			mt: true,
			mb: true
		}), _el$160, _co$38);
		(0, import_web$6.insert)(_el$105, (0, import_web$7.createComponent)(TextBox, {
			get value() {
				return searchDelay();
			},
			onInput: setSearchDelay,
			placeholder: "1500"
		}), _el$108, _co$23);
		(0, import_web$6.insert)(_el$109, (0, import_web$7.createComponent)(TextBox, {
			get value() {
				return deleteDelay();
			},
			onInput: setDeleteDelay,
			placeholder: "800"
		}), _el$112, _co$24);
		(0, import_web$6.insert)(_el$113, (0, import_web$7.createComponent)(Show, {
			get when() {
				return !isRunning();
			},
			get children() {
				return (0, import_web$7.createComponent)(Button, {
					get color() {
						return ButtonColors.RED;
					},
					onClick: start,
					children: "Start Deleting"
				});
			}
		}), _el$115, _co$25);
		(0, import_web$6.insert)(_el$113, (0, import_web$7.createComponent)(Show, {
			get when() {
				return isRunning();
			},
			get children() {
				return (0, import_web$7.createComponent)(Button, {
					get color() {
						return ButtonColors.PRIMARY;
					},
					onClick: stop,
					children: "Stop"
				});
			}
		}), _el$117, _co$26);
		(0, import_web$6.insert)(_el$76, (0, import_web$7.createComponent)(Show, {
			get when() {
				return progress();
			},
			get children() {
				const _el$118 = (0, import_web$3.getNextElement)(_tmpl$4), _el$119 = _el$118.firstChild, _el$120 = _el$119.firstChild, _el$121 = _el$120.nextSibling, _el$122 = _el$119.nextSibling, _el$123 = _el$122.firstChild, _el$124 = _el$123.nextSibling, _el$125 = _el$124.nextSibling, _el$126 = _el$125.nextSibling, _el$127 = _el$126.nextSibling, _el$128 = _el$127.nextSibling, _el$129 = _el$122.nextSibling, _el$130 = _el$129.firstChild, _el$131 = _el$130.nextSibling, _el$141 = _el$129.nextSibling, [_el$142, _co$29] = (0, import_web$5.getNextMarker)(_el$141.nextSibling), _el$143 = _el$142.nextSibling, [_el$144, _co$30] = (0, import_web$5.getNextMarker)(_el$143.nextSibling);
				(0, import_web$6.insert)(_el$121, () => progress().status);
				(0, import_web$6.insert)(_el$124, () => progress().deleted);
				(0, import_web$6.insert)(_el$126, () => progress().skipped);
				(0, import_web$6.insert)(_el$128, () => progress().failed);
				(0, import_web$6.insert)(_el$131, () => progress().totalEstimate);
				(0, import_web$6.insert)(_el$118, (0, import_web$7.createComponent)(Show, {
					get when() {
						return progress().currentMessage;
					},
					get children() {
						const _el$132 = (0, import_web$3.getNextElement)(_tmpl$2), _el$133 = _el$132.firstChild, _el$135 = _el$133.nextSibling, [_el$136, _co$27] = (0, import_web$5.getNextMarker)(_el$135.nextSibling), _el$134 = _el$136.nextSibling;
						(0, import_web$6.insert)(_el$132, () => progress().currentMessage, _el$136, _co$27);
						return _el$132;
					}
				}), _el$142, _co$29);
				(0, import_web$6.insert)(_el$118, (0, import_web$7.createComponent)(Show, {
					get when() {
						return progress().error;
					},
					get children() {
						const _el$137 = (0, import_web$3.getNextElement)(_tmpl$3), _el$138 = _el$137.firstChild, _el$139 = _el$138.nextSibling, [_el$140, _co$28] = (0, import_web$5.getNextMarker)(_el$139.nextSibling);
						_el$137.style.setProperty("color", "var(--text-danger)");
						_el$137.style.setProperty("margin-top", "6px");
						(0, import_web$6.insert)(_el$137, () => progress().error, _el$140, _co$28);
						return _el$137;
					}
				}), _el$144, _co$30);
				return _el$118;
			}
		}), _el$162, _co$39);
		return _el$76;
	})();
}
let cleanupCss;
let cleanupSection;
let cleanupObserver;
function onLoad() {
	cleanupCss = injectCss(styles);
	cleanupSection = registerSection("section", "undiscord", "Undiscord", UndiscordPanel);
	cleanupObserver = injectToolbarButton();
}
function onUnload() {
	stopDeletion();
	cleanupCss?.();
	cleanupSection?.();
	cleanupObserver?.();
	document.querySelectorAll(".undiscord-btn").forEach((el) => el.remove());
}
(0, import_web$1.delegateEvents)(["click"]);

//#endregion
exports.onLoad = onLoad
exports.onUnload = onUnload
return exports;
})({});