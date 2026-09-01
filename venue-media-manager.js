(function () {
  "use strict";

  const BUCKET = "venue-media";
  const MAX_IMAGES = 8;
  const MAX_VIDEOS = 2;
  const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
  const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

  let currentVenueId = "";
  let currentImages = [];
  let currentVideos = [];
  let pendingImages = [];
  let pendingVideos = [];
  let uploadInProgress = false;
  let modalObserver = null;

  const byId = id => document.getElementById(id);
  const safe = value => value === null || value === undefined ? "" : String(value);

  function getClient() {
    if (typeof window.getSupabaseClient === "function") {
      return window.getSupabaseClient();
    }
    return null;
  }

  function toast(message, type) {
    if (typeof window.showToast === "function") {
      window.showToast(message, type || "success");
    }
  }

  function installStyles() {
    if (byId("smvVenueGalleryStyles")) return;
    const style = document.createElement("style");
    style.id = "smvVenueGalleryStyles";
    style.textContent = `
      .venue-gallery-manager{margin-top:20px;padding:20px;border:1px solid #d8ebe6;border-radius:18px;background:linear-gradient(145deg,#f8fffd,#f2faf8)}
      .venue-gallery-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:15px}.venue-gallery-head h3{margin:3px 0 5px;color:#123f3a;font-size:18px}.venue-gallery-head p{margin:0;color:#667f7b;font-size:12px;line-height:1.5}.venue-gallery-counts{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.venue-gallery-counts span{padding:7px 10px;border-radius:999px;background:#e9f8f4;color:#087f6c;font-size:10px;font-weight:900;white-space:nowrap}
      .venue-gallery-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}.venue-gallery-drop{display:flex;align-items:center;justify-content:center;min-height:86px;padding:14px;border:1px dashed #91cfc1;border-radius:15px;background:#fff;color:#12695d;font-size:12px;font-weight:850;cursor:pointer;text-align:center;transition:.18s ease}.venue-gallery-drop:hover{border-color:#087f6c;background:#f3fffc;transform:translateY(-1px)}.venue-gallery-drop strong{display:block;font-size:16px;margin-bottom:4px;color:#075f51}.venue-gallery-drop small{display:block;color:#79918d;font-weight:600}
      .venue-gallery-preview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:15px}.venue-gallery-item{position:relative;min-height:112px;border:1px solid #dbeae7;border-radius:14px;overflow:hidden;background:#eaf4f1}.venue-gallery-item img,.venue-gallery-item video{display:block;width:100%;height:112px;object-fit:cover;background:#102724}.venue-gallery-item.pending{outline:2px solid rgba(8,127,108,.18)}.venue-gallery-item .media-tag{position:absolute;left:7px;bottom:7px;padding:4px 7px;border-radius:999px;background:rgba(3,24,23,.78);color:#fff;font-size:8px;font-weight:900}.venue-gallery-remove{position:absolute;right:6px;top:6px;width:27px;height:27px;border:0;border-radius:50%;background:rgba(120,24,24,.9);color:#fff;cursor:pointer;font-size:15px;line-height:1}.venue-gallery-empty{grid-column:1/-1;padding:17px;border:1px dashed #cedfdb;border-radius:13px;color:#7a928e;font-size:11px;text-align:center;background:#fff}
      .venue-gallery-status{margin-top:12px;min-height:18px;color:#667f7b;font-size:11px;font-weight:700}.venue-gallery-status.success{color:#087f6c}.venue-gallery-status.error{color:#b42318}.venue-gallery-status.warning{color:#9a6700}.venue-gallery-note{margin-top:8px;color:#7e938f;font-size:10px;line-height:1.45}
      @media(max-width:760px){.venue-gallery-head{display:block}.venue-gallery-counts{justify-content:flex-start;margin-top:10px}.venue-gallery-actions{grid-template-columns:1fr}.venue-gallery-preview{grid-template-columns:1fr 1fr}.venue-gallery-item img,.venue-gallery-item video{height:125px}}
    `;
    document.head.appendChild(style);
  }

  function installManager() {
    if (byId("venueGalleryManager")) return;
    const editor = document.querySelector(".venue-media-editor");
    if (!editor) return;

    const manager = document.createElement("section");
    manager.id = "venueGalleryManager";
    manager.className = "venue-gallery-manager";
    manager.innerHTML = `
      <div class="venue-gallery-head">
        <div>
          <div class="venue-kicker">PUBLIC MEDIA GALLERY</div>
          <h3>Add more venue photos & videos</h3>
          <p>Keep the cover image above, then add a richer gallery for the public venue profile.</p>
        </div>
        <div class="venue-gallery-counts">
          <span id="venueGalleryImageCount">0 / ${MAX_IMAGES} PHOTOS</span>
          <span id="venueGalleryVideoCount">0 / ${MAX_VIDEOS} VIDEOS</span>
        </div>
      </div>

      <div class="venue-gallery-actions">
        <label class="venue-gallery-drop" for="venueGalleryImages">
          <span><strong>＋ Add Venue Photos</strong><small>Select multiple JPG, PNG or WebP images · up to ${MAX_IMAGES}</small></span>
        </label>
        <input id="venueGalleryImages" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>

        <label class="venue-gallery-drop" for="venueGalleryVideos">
          <span><strong>▶ Add Venue Videos</strong><small>MP4 or WebM · up to ${MAX_VIDEOS} videos · 50 MB each</small></span>
        </label>
        <input id="venueGalleryVideos" type="file" accept="video/mp4,video/webm,video/quicktime" multiple hidden>
      </div>

      <div id="venueGalleryPreview" class="venue-gallery-preview">
        <div class="venue-gallery-empty">Save the venue, then its public gallery will appear here.</div>
      </div>
      <div id="venueGalleryStatus" class="venue-gallery-status" role="status" aria-live="polite"></div>
      <div class="venue-gallery-note">Photos are limited to 6 MB each. Videos are limited to 50 MB each. Selected media uploads automatically when you click <strong>Save Venue</strong>.</div>
    `;
    editor.insertAdjacentElement("afterend", manager);

    byId("venueGalleryImages")?.addEventListener("change", handleImageSelection);
    byId("venueGalleryVideos")?.addEventListener("change", handleVideoSelection);
    byId("venueGalleryPreview")?.addEventListener("click", handleRemoveClick);

    const form = byId("venueForm");
    if (form) {
      form.addEventListener("submit", () => {
        if (!pendingImages.length && !pendingVideos.length) return;
        setTimeout(() => processPendingAfterVenueSave(), 250);
      }, true);
    }

    const modal = byId("venueModal");
    if (modal && !modalObserver) {
      modalObserver = new MutationObserver(() => {
        if (!modal.hidden) {
          setTimeout(syncForOpenVenue, 0);
        }
      });
      modalObserver.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
    }
  }

  function setStatus(message, type) {
    const node = byId("venueGalleryStatus");
    if (!node) return;
    node.textContent = message || "";
    node.className = "venue-gallery-status" + (type ? ` ${type}` : "");
  }

  function mediaPublicUrl(path) {
    const client = getClient();
    if (!client || !path) return "";
    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    return safe(data?.publicUrl).trim();
  }

  function imageExtension(file) {
    return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" })[file?.type] || "jpg";
  }

  function videoExtension(file) {
    return ({ "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" })[file?.type] || "mp4";
  }

  function mapStorageRows(rows, kind) {
    return (rows || [])
      .filter(item => item && item.name && item.name !== ".emptyFolderPlaceholder")
      .map(item => {
        const folder = kind === "image" ? "gallery" : "videos";
        const path = `${currentVenueId}/${folder}/${item.name}`;
        return { kind, name: item.name, path, url: mediaPublicUrl(path), pending: false };
      });
  }

  async function loadExistingMedia() {
    const client = getClient();
    currentVenueId = safe(byId("venueId")?.value).trim();
    currentImages = [];
    currentVideos = [];

    if (!client || !currentVenueId) {
      renderGallery();
      setStatus("You can select photos and videos now. They will upload after the venue is saved.");
      return;
    }

    setStatus("Loading venue gallery…");

    const [imagesResult, videosResult] = await Promise.all([
      client.storage.from(BUCKET).list(`${currentVenueId}/gallery`, { limit: 100, sortBy: { column: "name", order: "asc" } }),
      client.storage.from(BUCKET).list(`${currentVenueId}/videos`, { limit: 100, sortBy: { column: "name", order: "asc" } })
    ]);

    if (imagesResult.error) console.warn("Venue gallery image list error:", imagesResult.error);
    if (videosResult.error) console.warn("Venue gallery video list error:", videosResult.error);

    currentImages = imagesResult.error ? [] : mapStorageRows(imagesResult.data, "image").slice(0, MAX_IMAGES);
    currentVideos = videosResult.error ? [] : mapStorageRows(videosResult.data, "video").slice(0, MAX_VIDEOS);

    renderGallery();

    if (imagesResult.error || videosResult.error) {
      setStatus("Gallery could not be fully loaded. You can still save venue details.", "warning");
    } else {
      setStatus(currentImages.length || currentVideos.length ? "Public media gallery loaded." : "No gallery media added yet.");
    }
  }

  function revokePendingUrls(items) {
    items.forEach(item => {
      if (item.previewUrl) {
        try { URL.revokeObjectURL(item.previewUrl); } catch (_) {}
      }
    });
  }

  function resetPending() {
    revokePendingUrls(pendingImages);
    revokePendingUrls(pendingVideos);
    pendingImages = [];
    pendingVideos = [];
    if (byId("venueGalleryImages")) byId("venueGalleryImages").value = "";
    if (byId("venueGalleryVideos")) byId("venueGalleryVideos").value = "";
  }

  function syncForOpenVenue() {
    resetPending();
    currentVenueId = safe(byId("venueId")?.value).trim();
    loadExistingMedia();
  }

  function handleImageSelection(event) {
    const files = Array.from(event.currentTarget?.files || []);
    const available = Math.max(0, MAX_IMAGES - currentImages.length - pendingImages.length);

    if (!available) {
      event.currentTarget.value = "";
      setStatus(`This venue already has the maximum ${MAX_IMAGES} gallery photos.`, "warning");
      return;
    }

    const accepted = [];
    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) continue;
      if (file.size > MAX_IMAGE_BYTES) {
        setStatus(`${file.name} is larger than 6 MB and was skipped.`, "warning");
        continue;
      }
      if (accepted.length >= available) break;
      accepted.push({ kind: "image", file, name: file.name, previewUrl: URL.createObjectURL(file), pending: true });
    }

    pendingImages.push(...accepted);
    event.currentTarget.value = "";
    renderGallery();
    if (accepted.length) setStatus(`${accepted.length} photo${accepted.length === 1 ? "" : "s"} ready to upload when you save.`, "success");
  }

  function handleVideoSelection(event) {
    const files = Array.from(event.currentTarget?.files || []);
    const available = Math.max(0, MAX_VIDEOS - currentVideos.length - pendingVideos.length);

    if (!available) {
      event.currentTarget.value = "";
      setStatus(`This venue already has the maximum ${MAX_VIDEOS} videos.`, "warning");
      return;
    }

    const accepted = [];
    for (const file of files) {
      if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) continue;
      if (file.size > MAX_VIDEO_BYTES) {
        setStatus(`${file.name} is larger than 50 MB and was skipped.`, "warning");
        continue;
      }
      if (accepted.length >= available) break;
      accepted.push({ kind: "video", file, name: file.name, previewUrl: URL.createObjectURL(file), pending: true });
    }

    pendingVideos.push(...accepted);
    event.currentTarget.value = "";
    renderGallery();
    if (accepted.length) setStatus(`${accepted.length} video${accepted.length === 1 ? "" : "s"} ready to upload when you save.`, "success");
  }

  function escapeHtml(value) {
    return safe(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  }

  function mediaTile(item, index, source) {
    const src = item.pending ? item.previewUrl : item.url;
    const media = item.kind === "video"
      ? `<video src="${escapeHtml(src)}" muted playsinline preload="metadata"></video>`
      : `<img src="${escapeHtml(src)}" alt="Venue gallery photo">`;
    const tag = item.pending ? `NEW ${item.kind.toUpperCase()}` : item.kind.toUpperCase();
    return `<div class="venue-gallery-item ${item.pending ? "pending" : ""}">${media}<span class="media-tag">${tag}</span><button type="button" class="venue-gallery-remove" data-media-source="${source}" data-media-index="${index}" aria-label="Remove media">×</button></div>`;
  }

  function renderGallery() {
    const preview = byId("venueGalleryPreview");
    if (!preview) return;

    const existing = [...currentImages, ...currentVideos];
    const pending = [...pendingImages, ...pendingVideos];
    const html = [];

    existing.forEach((item, index) => html.push(mediaTile(item, index, "existing")));
    pending.forEach((item, index) => html.push(mediaTile(item, index, "pending")));

    preview.innerHTML = html.length ? html.join("") : `<div class="venue-gallery-empty">Add up to ${MAX_IMAGES} venue photos and ${MAX_VIDEOS} videos. They will appear on the public venue profile.</div>`;

    const imageCount = currentImages.length + pendingImages.length;
    const videoCount = currentVideos.length + pendingVideos.length;
    if (byId("venueGalleryImageCount")) byId("venueGalleryImageCount").textContent = `${imageCount} / ${MAX_IMAGES} PHOTOS`;
    if (byId("venueGalleryVideoCount")) byId("venueGalleryVideoCount").textContent = `${videoCount} / ${MAX_VIDEOS} VIDEOS`;
  }

  async function handleRemoveClick(event) {
    const button = event.target.closest(".venue-gallery-remove");
    if (!button) return;

    const source = button.dataset.mediaSource;
    const index = Number(button.dataset.mediaIndex);

    if (source === "pending") {
      const combined = [...pendingImages, ...pendingVideos];
      const item = combined[index];
      if (!item) return;
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      if (item.kind === "image") pendingImages = pendingImages.filter(x => x !== item);
      else pendingVideos = pendingVideos.filter(x => x !== item);
      renderGallery();
      setStatus("Selected media removed.");
      return;
    }

    const combined = [...currentImages, ...currentVideos];
    const item = combined[index];
    if (!item || !item.path) return;

    if (!window.confirm(`Remove this ${item.kind} from the public venue gallery?`)) return;

    const client = getClient();
    if (!client) return;

    button.disabled = true;
    setStatus(`Removing ${item.kind}…`);
    const { error } = await client.storage.from(BUCKET).remove([item.path]);

    if (error) {
      console.error("Venue gallery remove error:", error);
      setStatus(error.message || "Unable to remove media.", "error");
      button.disabled = false;
      return;
    }

    if (item.kind === "image") currentImages = currentImages.filter(x => x !== item);
    else currentVideos = currentVideos.filter(x => x !== item);
    renderGallery();
    setStatus("Media removed successfully.", "success");
  }

  async function waitForVenueId(timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const id = safe(byId("venueId")?.value).trim();
      if (id) return id;
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    return "";
  }

  async function uploadOne(venueId, item) {
    const client = getClient();
    if (!client) throw new Error("Media upload is not ready.");

    const random = Math.random().toString(36).slice(2, 8);
    const folder = item.kind === "image" ? "gallery" : "videos";
    const extension = item.kind === "image" ? imageExtension(item.file) : videoExtension(item.file);
    const prefix = item.kind === "image" ? "image" : "video";
    const path = `${venueId}/${folder}/${prefix}-${Date.now()}-${random}.${extension}`;

    const { error } = await client.storage.from(BUCKET).upload(path, item.file, {
      cacheControl: "3600",
      contentType: item.file.type,
      upsert: false
    });
    if (error) throw error;
    return path;
  }

  async function processPendingAfterVenueSave() {
    if (uploadInProgress || (!pendingImages.length && !pendingVideos.length)) return;

    const venueId = await waitForVenueId(9000);
    if (!venueId) {
      setStatus("Venue was not saved, so media was not uploaded.", "error");
      return;
    }

    const saveButton = byId("saveVenueBtn");
    uploadInProgress = true;
    const items = [...pendingImages, ...pendingVideos];
    let uploaded = 0;

    try {
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = `Uploading media 0/${items.length}…`;
      }

      for (let i = 0; i < items.length; i += 1) {
        setStatus(`Uploading media ${i + 1} of ${items.length}…`);
        await uploadOne(venueId, items[i]);
        uploaded += 1;
        if (saveButton) saveButton.textContent = `Uploading media ${uploaded}/${items.length}…`;
      }

      resetPending();
      currentVenueId = venueId;
      await loadExistingMedia();
      setStatus(`${uploaded} media file${uploaded === 1 ? "" : "s"} uploaded successfully.`, "success");
      toast(`${uploaded} venue media file${uploaded === 1 ? "" : "s"} uploaded.`, "success");
    } catch (error) {
      console.error("Venue gallery upload error:", error);
      const message = safe(error?.message || error);
      const videoHint = /mime|type|bucket|size|payload|exceeded/i.test(message) && pendingVideos.length
        ? " Run the new venue gallery/video Supabase migration if video uploads are not enabled yet."
        : "";
      setStatus((message || "Unable to upload venue media.") + videoHint, "error");
      toast("Venue details saved, but some media could not be uploaded.", "error");
    } finally {
      uploadInProgress = false;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save Venue";
      }
    }
  }

  function init() {
    installStyles();
    installManager();
    const modal = byId("venueModal");
    if (modal && !modal.hidden) syncForOpenVenue();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
