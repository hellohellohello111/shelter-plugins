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
const _tmpl$ = /*#__PURE__*/ (0, import_web.template)(`<div class="current-msg">Current: <!#><!/>...</div>`, 4), _tmpl$2 = /*#__PURE__*/ (0, import_web.template)(`<div>Error: <!#><!/></div>`, 4), _tmpl$3 = /*#__PURE__*/ (0, import_web.template)(`<div class="undiscord-progress"><div class="stat">Status: <b></b></div><div class="stat">Deleted: <b></b> | Skipped: <b></b> | Failed: <b></b></div><div class="stat">Estimated total: <b></b></div><!#><!/><!#><!/></div>`, 22), _tmpl$4 = /*#__PURE__*/ (0, import_web.template)(`<div class="undiscord-modal-body"><div class="context-info">Target: <b></b></div><!#><!/><div class="undiscord-buttons"><!#><!/><!#><!/></div></div>`, 14), _tmpl$5 = /*#__PURE__*/ (0, import_web.template)(`<div><div class="field"><label>Regex Pattern (client-side)</label><!#><!/></div><div class="field-row"><div class="field"><label>Search Delay (ms)</label><!#><!/></div><div class="field"><label>Delete Delay (ms)</label><!#><!/></div></div></div>`, 22), _tmpl$6 = /*#__PURE__*/ (0, import_web.template)(`<div class="field"><label>Delay (seconds)</label><!#><!/></div>`, 6), _tmpl$7 = /*#__PURE__*/ (0, import_web.template)(`<div class="undiscord-modal-body"><div class="context-info">Deleting your messages in: <b></b></div><div class="field"><label>Content Search</label><!#><!/></div><div class="field-row"><div class="field"><label>After Date</label><!#><!/></div><div class="field"><label>Before Date</label><!#><!/></div></div><!#><!/><!#><!/><!#><!/><div class="undiscord-advanced"><!#><!/> advanced options</div><!#><!/><div class="undiscord-buttons"></div><!#><!/><!#><!/><!#><!/><!#><!/><!#><!/></div>`, 50);
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
	const { guildId, channelId, authorId, beforeDate, afterDate, content, hasLink, hasFile, includeNsfw, includePinned, pattern, searchDelay, deleteDelay } = config;
	const minId = afterDate ? dateToSnowflake(afterDate) : null;
	const maxId = beforeDate ? dateToSnowflake(beforeDate) : null;
	const regex = pattern ? new RegExp(pattern, "i") : null;
	let deleted = 0, skipped = 0, failed = 0, offset = 0, totalEstimate = 0;
	const userId = authorId || stores.UserStore?.getCurrentUser()?.id;
	showFloatingPill();
	try {
		while (!stopRequested) {
			broadcastProgress({
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
				const SYSTEM_TYPES = new Set([
					1,
					2,
					3,
					4,
					5
				]);
				if (SYSTEM_TYPES.has(msg.type)) {
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
				broadcastProgress({
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
		broadcastProgress({
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
	broadcastProgress({
		status: "done",
		deleted,
		skipped,
		failed,
		totalEstimate
	});
	showToast({
		title: "Undiscord",
		content: `Done! Deleted ${deleted} messages.`,
		duration: 5e3
	});
	setTimeout(() => {
		if (!running) hideFloatingPill();
	}, 1e4);
}
function stopDeletion() {
	stopRequested = true;
	running = false;
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
let pillElement = null;
function showFloatingPill() {
	if (pillElement) return;
	const pill = document.createElement("div");
	pill.className = "undiscord-pill";
	pill.title = "Click to open Undiscord";
	pill.innerHTML = `<span class="undiscord-pill-icon">${TRASH_SVG}</span><span class="undiscord-pill-text">Starting...</span>`;
	pill.addEventListener("click", () => openProgressModal());
	document.body.appendChild(pill);
	pillElement = pill;
	const unlisten = addProgressListener((p) => {
		const textEl = pill.querySelector(".undiscord-pill-text");
		if (!textEl) return;
		if (p.status === "deleting" || p.status === "searching") textEl.textContent = `Deleting... ${p.deleted}/${p.totalEstimate}`;
else if (p.status === "done") textEl.textContent = `Done! ${p.deleted} deleted`;
else if (p.status === "error") textEl.textContent = `Error - ${p.deleted} deleted`;
else textEl.textContent = p.status;
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
		return (0, import_web$7.createComponent)(ModalRoot, { get children() {
			return [(0, import_web$7.createComponent)(ModalHeader, {
				get close() {
					return mprops.close;
				},
				children: "Undiscord - Progress"
			}), (0, import_web$7.createComponent)(ModalBody, { get children() {
				const _el$ = (0, import_web$4.getNextElement)(_tmpl$4), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$35 = _el$2.nextSibling, [_el$36, _co$7] = (0, import_web$5.getNextMarker)(_el$35.nextSibling), _el$30 = _el$36.nextSibling, _el$31 = _el$30.firstChild, [_el$32, _co$5] = (0, import_web$5.getNextMarker)(_el$31.nextSibling), _el$33 = _el$32.nextSibling, [_el$34, _co$6] = (0, import_web$5.getNextMarker)(_el$33.nextSibling);
				(0, import_web$6.insert)(_el$4, currentLabel);
				(0, import_web$6.insert)(_el$, (0, import_web$7.createComponent)(Show, {
					get when() {
						return progress();
					},
					get children() {
						const _el$5 = (0, import_web$4.getNextElement)(_tmpl$3), _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$1.nextSibling, _el$11 = _el$10.nextSibling, _el$12 = _el$11.nextSibling, _el$13 = _el$12.nextSibling, _el$14 = _el$9.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$26 = _el$14.nextSibling, [_el$27, _co$3] = (0, import_web$5.getNextMarker)(_el$26.nextSibling), _el$28 = _el$27.nextSibling, [_el$29, _co$4] = (0, import_web$5.getNextMarker)(_el$28.nextSibling);
						(0, import_web$6.insert)(_el$8, () => progress().status);
						(0, import_web$6.insert)(_el$1, () => progress().deleted);
						(0, import_web$6.insert)(_el$11, () => progress().skipped);
						(0, import_web$6.insert)(_el$13, () => progress().failed);
						(0, import_web$6.insert)(_el$16, () => progress().totalEstimate);
						(0, import_web$6.insert)(_el$5, (0, import_web$7.createComponent)(Show, {
							get when() {
								return progress().currentMessage;
							},
							get children() {
								const _el$17 = (0, import_web$4.getNextElement)(_tmpl$), _el$18 = _el$17.firstChild, _el$20 = _el$18.nextSibling, [_el$21, _co$] = (0, import_web$5.getNextMarker)(_el$20.nextSibling), _el$19 = _el$21.nextSibling;
								(0, import_web$6.insert)(_el$17, () => progress().currentMessage, _el$21, _co$);
								return _el$17;
							}
						}), _el$27, _co$3);
						(0, import_web$6.insert)(_el$5, (0, import_web$7.createComponent)(Show, {
							get when() {
								return progress().error;
							},
							get children() {
								const _el$22 = (0, import_web$4.getNextElement)(_tmpl$2), _el$23 = _el$22.firstChild, _el$24 = _el$23.nextSibling, [_el$25, _co$2] = (0, import_web$5.getNextMarker)(_el$24.nextSibling);
								_el$22.style.setProperty("color", "var(--text-danger)");
								_el$22.style.setProperty("margin-top", "6px");
								(0, import_web$6.insert)(_el$22, () => progress().error, _el$25, _co$2);
								return _el$22;
							}
						}), _el$29, _co$4);
						return _el$5;
					}
				}), _el$36, _co$7);
				(0, import_web$6.insert)(_el$30, (0, import_web$7.createComponent)(Show, {
					get when() {
						return isRunning();
					},
					get children() {
						return (0, import_web$7.createComponent)(Button, {
							get color() {
								return ButtonColors.RED;
							},
							onClick: stop,
							children: "Stop"
						});
					}
				}), _el$32, _co$5);
				(0, import_web$6.insert)(_el$30, (0, import_web$7.createComponent)(Show, {
					get when() {
						return (0, import_web$3.memo)(() => !!!isRunning())() && (progress()?.status === "done" || progress()?.status === "error");
					},
					get children() {
						return (0, import_web$7.createComponent)(Button, {
							get color() {
								return ButtonColors.PRIMARY;
							},
							onClick: dismiss,
							children: "Dismiss"
						});
					}
				}), _el$34, _co$6);
				return _el$;
			} })];
		} });
	});
}
function openUndiscordModal() {
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
		const label = ctx.guildId === "@me" ? `DM: ${ctx.channelName || ctx.channelId}` : `#${ctx.channelName || ctx.channelId} in ${ctx.guildName || ctx.guildId}`;
		const start = () => {
			mprops.close();
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
			}, label);
		};
		return (0, import_web$7.createComponent)(ModalRoot, { get children() {
			return [(0, import_web$7.createComponent)(ModalHeader, {
				get close() {
					return mprops.close;
				},
				children: "Undiscord - Purge Messages"
			}), (0, import_web$7.createComponent)(ModalBody, { get children() {
				const _el$37 = (0, import_web$4.getNextElement)(_tmpl$7), _el$38 = _el$37.firstChild, _el$39 = _el$38.firstChild, _el$40 = _el$39.nextSibling, _el$41 = _el$38.nextSibling, _el$42 = _el$41.firstChild, _el$43 = _el$42.nextSibling, [_el$44, _co$8] = (0, import_web$5.getNextMarker)(_el$43.nextSibling), _el$45 = _el$41.nextSibling, _el$46 = _el$45.firstChild, _el$47 = _el$46.firstChild, _el$48 = _el$47.nextSibling, [_el$49, _co$9] = (0, import_web$5.getNextMarker)(_el$48.nextSibling), _el$50 = _el$46.nextSibling, _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling, [_el$53, _co$0] = (0, import_web$5.getNextMarker)(_el$52.nextSibling), _el$77 = _el$45.nextSibling, [_el$78, _co$14] = (0, import_web$5.getNextMarker)(_el$77.nextSibling), _el$79 = _el$78.nextSibling, [_el$80, _co$15] = (0, import_web$5.getNextMarker)(_el$79.nextSibling), _el$81 = _el$80.nextSibling, [_el$82, _co$16] = (0, import_web$5.getNextMarker)(_el$81.nextSibling), _el$54 = _el$82.nextSibling, _el$56 = _el$54.firstChild, [_el$57, _co$1] = (0, import_web$5.getNextMarker)(_el$56.nextSibling), _el$55 = _el$57.nextSibling, _el$83 = _el$54.nextSibling, [_el$84, _co$17] = (0, import_web$5.getNextMarker)(_el$83.nextSibling), _el$72 = _el$84.nextSibling, _el$85 = _el$72.nextSibling, [_el$86, _co$18] = (0, import_web$5.getNextMarker)(_el$85.nextSibling), _el$87 = _el$86.nextSibling, [_el$88, _co$19] = (0, import_web$5.getNextMarker)(_el$87.nextSibling), _el$89 = _el$88.nextSibling, [_el$90, _co$20] = (0, import_web$5.getNextMarker)(_el$89.nextSibling), _el$91 = _el$90.nextSibling, [_el$92, _co$21] = (0, import_web$5.getNextMarker)(_el$91.nextSibling), _el$93 = _el$92.nextSibling, [_el$94, _co$22] = (0, import_web$5.getNextMarker)(_el$93.nextSibling);
				(0, import_web$6.insert)(_el$40, label);
				(0, import_web$6.insert)(_el$41, (0, import_web$7.createComponent)(TextBox, {
					get value() {
						return content();
					},
					onInput: setContent,
					placeholder: "Leave empty for all messages"
				}), _el$44, _co$8);
				(0, import_web$6.insert)(_el$46, (0, import_web$7.createComponent)(TextBox, {
					get value() {
						return afterDate();
					},
					onInput: setAfterDate,
					placeholder: "YYYY-MM-DD"
				}), _el$49, _co$9);
				(0, import_web$6.insert)(_el$50, (0, import_web$7.createComponent)(TextBox, {
					get value() {
						return beforeDate();
					},
					onInput: setBeforeDate,
					placeholder: "YYYY-MM-DD"
				}), _el$53, _co$0);
				(0, import_web$6.insert)(_el$37, (0, import_web$7.createComponent)(SwitchItem, {
					get value() {
						return hasLink();
					},
					onChange: setHasLink,
					children: "Only messages with links"
				}), _el$78, _co$14);
				(0, import_web$6.insert)(_el$37, (0, import_web$7.createComponent)(SwitchItem, {
					get value() {
						return hasFile();
					},
					onChange: setHasFile,
					children: "Only messages with files"
				}), _el$80, _co$15);
				(0, import_web$6.insert)(_el$37, (0, import_web$7.createComponent)(SwitchItem, {
					get value() {
						return includePinned();
					},
					onChange: setIncludePinned,
					children: "Include pinned messages"
				}), _el$82, _co$16);
				_el$54.$$click = () => setShowAdvanced(!showAdvanced());
				(0, import_web$6.insert)(_el$54, () => showAdvanced() ? "Hide" : "Show", _el$57, _co$1);
				(0, import_web$6.insert)(_el$37, (0, import_web$7.createComponent)(Show, {
					get when() {
						return showAdvanced();
					},
					get children() {
						const _el$58 = (0, import_web$4.getNextElement)(_tmpl$5), _el$59 = _el$58.firstChild, _el$60 = _el$59.firstChild, _el$61 = _el$60.nextSibling, [_el$62, _co$10] = (0, import_web$5.getNextMarker)(_el$61.nextSibling), _el$63 = _el$59.nextSibling, _el$64 = _el$63.firstChild, _el$65 = _el$64.firstChild, _el$66 = _el$65.nextSibling, [_el$67, _co$11] = (0, import_web$5.getNextMarker)(_el$66.nextSibling), _el$68 = _el$64.nextSibling, _el$69 = _el$68.firstChild, _el$70 = _el$69.nextSibling, [_el$71, _co$12] = (0, import_web$5.getNextMarker)(_el$70.nextSibling);
						_el$58.style.setProperty("margin-top", "8px");
						(0, import_web$6.insert)(_el$59, (0, import_web$7.createComponent)(TextBox, {
							get value() {
								return pattern();
							},
							onInput: setPattern,
							placeholder: "e.g. hello|world"
						}), _el$62, _co$10);
						(0, import_web$6.insert)(_el$64, (0, import_web$7.createComponent)(TextBox, {
							get value() {
								return searchDelay();
							},
							onInput: setSearchDelay,
							placeholder: "1500"
						}), _el$67, _co$11);
						(0, import_web$6.insert)(_el$68, (0, import_web$7.createComponent)(TextBox, {
							get value() {
								return deleteDelay();
							},
							onInput: setDeleteDelay,
							placeholder: "800"
						}), _el$71, _co$12);
						return _el$58;
					}
				}), _el$84, _co$17);
				(0, import_web$6.insert)(_el$72, (0, import_web$7.createComponent)(Button, {
					get color() {
						return ButtonColors.RED;
					},
					onClick: start,
					children: "Start Deleting"
				}));
				(0, import_web$6.insert)(_el$37, (0, import_web$7.createComponent)(Divider, {
					mt: true,
					mb: true
				}), _el$86, _co$18);
				(0, import_web$6.insert)(_el$37, (0, import_web$7.createComponent)(Header, {
					get tag() {
						return HeaderTags.H3;
					},
					children: "Autodelete"
				}), _el$88, _co$19);
				(0, import_web$6.insert)(_el$37, (0, import_web$7.createComponent)(Text, {
					style: {
						"margin-bottom": "8px",
						"font-size": "13px",
						color: "var(--text-muted)"
					},
					children: "Automatically delete your new messages after a delay."
				}), _el$90, _co$20);
				(0, import_web$6.insert)(_el$37, (0, import_web$7.createComponent)(SwitchItem, {
					get value() {
						return store.autodeleteEnabled || false;
					},
					onChange: (v) => {
						store.autodeleteEnabled = v;
						if (v) startAutodelete();
else stopAutodelete();
					},
					children: "Enable autodelete"
				}), _el$92, _co$21);
				(0, import_web$6.insert)(_el$37, (0, import_web$7.createComponent)(Show, {
					get when() {
						return store.autodeleteEnabled;
					},
					get children() {
						const _el$73 = (0, import_web$4.getNextElement)(_tmpl$6), _el$74 = _el$73.firstChild, _el$75 = _el$74.nextSibling, [_el$76, _co$13] = (0, import_web$5.getNextMarker)(_el$75.nextSibling);
						(0, import_web$6.insert)(_el$73, (0, import_web$7.createComponent)(TextBox, {
							get value() {
								return String(store.autodeleteDelay || 30);
							},
							onInput: (v) => {
								store.autodeleteDelay = v;
							},
							placeholder: "30"
						}), _el$76, _co$13);
						return _el$73;
					}
				}), _el$94, _co$22);
				(0, import_web$2.runHydrationEvents)();
				return _el$37;
			} })];
		} });
	});
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
.undiscord-pill {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 20px;
  background: var(--background-floating);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  color: var(--text-normal);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  animation: undiscord-pill-in 0.3s ease-out;
}
.undiscord-pill:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}
.undiscord-pill-icon {
  display: flex;
  align-items: center;
}
.undiscord-pill-icon svg {
  width: 16px;
  height: 16px;
  stroke: var(--status-danger);
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
const TRASH_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
let autodeleteUnsub = null;
function startAutodelete() {
	if (autodeleteUnsub) return;
	const userId = stores.UserStore?.getCurrentUser()?.id;
	if (!userId) return;
	const handler = async (payload) => {
		if (!store.autodeleteEnabled) return;
		const msg = payload.message;
		if (!msg || msg.author?.id !== userId) return;
		const delay = (parseInt(store.autodeleteDelay) || 30) * 1e3;
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
let cleanupCss;
let cleanupObserver;
function onLoad() {
	cleanupCss = injectCss(styles);
	cleanupObserver = injectToolbarButton();
	if (store.autodeleteEnabled) startAutodelete();
}
function onUnload() {
	stopDeletion();
	stopAutodelete();
	hideFloatingPill();
	cleanupCss?.();
	cleanupObserver?.();
	progressListeners = [];
	document.querySelectorAll(".undiscord-btn").forEach((el) => el.remove());
}
(0, import_web$1.delegateEvents)(["click"]);

//#endregion
exports.onLoad = onLoad
exports.onUnload = onUnload
return exports;
})({});