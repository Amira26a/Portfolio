const config = window.PORTFOLIO_CONFIG;
const setupNotice = document.querySelector("#setup-notice");
const loginForm = document.querySelector("#login-form");
const loginFeedback = document.querySelector("#login-feedback");
const loginView = document.querySelector("#login-view");
const adminApp = document.querySelector("#admin-app");
const globalFeedback = document.querySelector("#global-feedback");
const panelNames = {
  overview: "نظرة عامة",
  projects: "المشاريع",
  metrics: "المؤشرات",
  certificates: "الشهادات والتدريب",
  skills: "المهارات",
  messages: "رسائل التواصل"
};
const collections = {
  projects: {
    title: "مشروع",
    fields: [
      { key: "title", label: "اسم المشروع", required: true },
      { key: "category", label: "التصنيف", type: "select", options: [["excel-sql", "Excel و SQL"], ["python", "Python و EDA"], ["power-bi", "Power BI"]], required: true },
      { key: "description", label: "وصف المشروع", type: "textarea", required: true },
      { key: "tools", label: "الأدوات (افصل بينها بفاصلة)", type: "tags" },
      { key: "github_url", label: "رابط GitHub", type: "url" },
      { key: "dashboard_url", label: "رابط لوحة العرض", type: "url" },
      { key: "sort_order", label: "ترتيب الظهور", type: "number" },
      { key: "featured", label: "مشروع مميز", type: "checkbox" }
    ],
    summary: (row) => `${row.description || ""} · ${(row.tools || []).join("، ")}`
  },
  metrics: {
    title: "مؤشر",
    fields: [
      { key: "title", label: "عنوان المؤشر", required: true },
      { key: "value", label: "القيمة", type: "number", required: true },
      { key: "suffix", label: "إضافة بعد الرقم (مثل +)", half: true },
      { key: "sort_order", label: "ترتيب الظهور", type: "number", half: true },
      { key: "description", label: "وصف مختصر", type: "textarea" }
    ],
    summary: (row) => `${row.value}${row.suffix || ""} · ${row.description || ""}`
  },
  certificates: {
    title: "شهادة",
    fields: [
      { key: "title", label: "اسم الشهادة أو التدريب", required: true },
      { key: "organization", label: "الجهة المانحة", required: true },
      { key: "status", label: "الحالة", type: "select", options: [["completed", "مكتملة"], ["in-progress", "قيد الدراسة"], ["upcoming", "قادمة"]] },
      { key: "credential_url", label: "رابط الشهادة", type: "url" },
      { key: "sort_order", label: "ترتيب الظهور", type: "number" },
      { key: "details", label: "التفاصيل والأدوات", type: "textarea" }
    ],
    summary: (row) => `${row.organization || ""} · ${row.details || ""}`
  },
  skills: {
    title: "مهارة",
    fields: [
      { key: "category", label: "المجموعة", type: "select", options: [["analysis", "تحليل ونمذجة"], ["tools", "أدوات ولغات"]], required: true },
      { key: "name", label: "اسم المهارة", required: true },
      { key: "sort_order", label: "ترتيب الظهور", type: "number" }
    ],
    summary: (row) => row.category === "analysis" ? "تحليل ونمذجة" : "أدوات ولغات"
  }
};

let client;
let activePanel = "overview";
let cachedRows = {};
let editingId = null;

function showLogin(message = "") {
  loginView.hidden = false;
  adminApp.hidden = true;
  loginFeedback.textContent = message;
}

function showNotice(message) {
  setupNotice.hidden = false;
  setupNotice.textContent = message;
  loginForm.hidden = true;
}

function announce(message, isError = false) {
  globalFeedback.textContent = message;
  globalFeedback.classList.toggle("is-error", isError);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formattedDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function setPanel(name) {
  activePanel = name;
  document.querySelectorAll(".admin-tabs [data-panel]").forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.panel === name));
  });
  document.querySelectorAll(".admin-panel").forEach((panel) => {
    panel.hidden = panel.id !== `panel-${name}`;
  });
  document.querySelector("#current-panel-name").textContent = panelNames[name];

  if (collections[name]) loadCollection(name);
  if (name === "messages") loadMessages();
}

async function readRows(table) {
  const orderColumn = table === "messages" ? "created_at" : "sort_order";
  const query = client.from(table).select("*").order(orderColumn, { ascending: table !== "messages" });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function showEmpty(container, message) {
  container.replaceChildren(createElement("p", "empty-records", message));
}

function renderCollection(name, rows) {
  const panel = document.querySelector(`#panel-${name}`);
  const list = panel.querySelector(".record-list");
  list.replaceChildren();
  if (!rows.length) {
    showEmpty(list, `لا توجد سجلات «${collections[name].title}» محفوظة بعد. أضف أول سجل للبدء.`);
    return;
  }

  rows.forEach((row) => {
    const article = createElement("article", "record-row");
    const summary = createElement("div", "record-main");
    const primary = row.title || row.name || "بدون عنوان";
    summary.append(createElement("strong", "", primary));
    summary.append(createElement("span", "", collections[name].summary(row)));

    const actions = createElement("div", "record-actions");
    const editButton = createElement("button", "small-action", "تعديل");
    editButton.type = "button";
    editButton.addEventListener("click", () => openEditor(name, row));
    const deleteButton = createElement("button", "small-action is-danger", "حذف");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteRecord(name, row.id));
    actions.append(editButton, deleteButton);
    article.append(summary, actions);
    list.append(article);
  });
}

async function loadCollection(name) {
  announce("");
  try {
    const rows = await readRows(name);
    cachedRows[name] = rows;
    renderCollection(name, rows);
  } catch (error) {
    announce(`تعذر تحميل البيانات: ${error.message}`, true);
  }
}

function appendEditorField(form, field, value, index) {
  const id = `editor-field-${index}`;
  const label = createElement("label", field.half ? "half-field" : "", field.label);
  label.htmlFor = id;
  form.append(label);

  let input;
  if (field.type === "textarea") {
    input = document.createElement("textarea");
    input.value = value || "";
  } else if (field.type === "select") {
    input = document.createElement("select");
    field.options.forEach(([optionValue, optionLabel]) => {
      const option = createElement("option", "", optionLabel);
      option.value = optionValue;
      input.append(option);
    });
    input.value = value || field.options[0][0];
  } else if (field.type === "checkbox") {
    const wrapper = createElement("label", "checkbox-field", "");
    input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(value);
    wrapper.append(input, document.createTextNode(field.label));
    form.append(wrapper);
    label.remove();
    input.name = field.key;
    return;
  } else {
    input = document.createElement("input");
    input.type = field.type === "tags" ? "text" : (field.type || "text");
    if (field.type === "tags") input.value = Array.isArray(value) ? value.join(", ") : "";
    else input.value = value ?? (field.type === "number" ? 0 : "");
  }

  input.id = id;
  input.name = field.key;
  input.required = Boolean(field.required);
  if (field.half) input.className = "half-field";
  if (field.type === "tags") input.placeholder = "مثال: Python، Pandas، SQL";
  form.append(input);
}

function openEditor(name, row = null) {
  const panel = document.querySelector(`#panel-${name}`);
  const form = panel.querySelector(".record-editor");
  editingId = row?.id || null;
  form.replaceChildren();
  form.hidden = false;
  form.dataset.collection = name;

  collections[name].fields.forEach((field, index) => appendEditorField(form, field, row?.[field.key], index));
  const actions = createElement("div", "editor-actions");
  const saveButton = createElement("button", "admin-primary", editingId ? "حفظ التعديلات" : "إضافة");
  saveButton.type = "submit";
  const cancelButton = createElement("button", "admin-secondary", "إلغاء");
  cancelButton.type = "button";
  cancelButton.addEventListener("click", () => { form.hidden = true; editingId = null; });
  actions.append(saveButton, cancelButton);
  form.append(actions);
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function getEditorValues(form, name) {
  const values = {};
  collections[name].fields.forEach((field) => {
    const input = form.elements.namedItem(field.key);
    if (field.type === "checkbox") values[field.key] = input.checked;
    else if (field.type === "number") values[field.key] = Number(input.value || 0);
    else if (field.type === "tags") values[field.key] = input.value.split(",").map((tag) => tag.trim()).filter(Boolean);
    else values[field.key] = input.value.trim();
  });
  return values;
}

async function saveRecord(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.dataset.collection;
  const values = getEditorValues(form, name);
  const saveButton = form.querySelector('button[type="submit"]');
  saveButton.disabled = true;

  try {
    const query = editingId
      ? client.from(name).update(values).eq("id", editingId)
      : client.from(name).insert(values);
    const { error } = await query;
    if (error) throw error;
    form.hidden = true;
    editingId = null;
    announce("تم حفظ التغييرات بنجاح.");
    await Promise.all([loadCollection(name), refreshOverview()]);
  } catch (error) {
    announce(`تعذر حفظ التغييرات: ${error.message}`, true);
  } finally {
    saveButton.disabled = false;
  }
}

async function deleteRecord(name, id) {
  if (!window.confirm("هل تريد حذف هذا السجل نهائياً؟")) return;
  const { error } = await client.from(name).delete().eq("id", id);
  if (error) {
    announce(`تعذر الحذف: ${error.message}`, true);
    return;
  }
  announce("تم حذف السجل.");
  await Promise.all([loadCollection(name), refreshOverview()]);
}

function buildMessageRow(message, compact = false) {
  const article = createElement("article", `message-row${message.is_read ? "" : " is-unread"}`);
  const summary = createElement("div", "message-summary");
  const sender = createElement("strong", "", message.name || "بدون اسم");
  summary.append(sender);

  const email = createElement("span", "", message.email || "");
  summary.append(email);
  summary.append(createElement("time", "", formattedDate(message.created_at)));
  if (!compact) summary.append(createElement("p", "message-content", message.message || ""));

  const actions = createElement("div", "message-actions");
  if (!message.is_read) {
    const readButton = createElement("button", "small-action", "تحديد كمقروءة");
    readButton.type = "button";
    readButton.addEventListener("click", () => updateMessage(message.id, { is_read: true }));
    actions.append(readButton);
  }
  if (!compact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email || "")) {
    const replyLink = createElement("a", "small-action", "رد بالبريد");
    replyLink.href = `mailto:${message.email}`;
    actions.append(replyLink);
  }
  if (!compact) {
    const deleteButton = createElement("button", "small-action is-danger", "حذف");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteMessage(message.id));
    actions.append(deleteButton);
  }
  article.append(summary, actions);
  return article;
}

async function loadMessages() {
  try {
    const messages = await readRows("messages");
    cachedRows.messages = messages;
    const allList = document.querySelector("#all-messages");
    const recentList = document.querySelector("#recent-messages");
    allList.replaceChildren();
    recentList.replaceChildren();
    document.querySelector("#inbox-count").textContent = `${messages.length} رسالة`;
    if (!messages.length) {
      showEmpty(allList, "لا توجد رسائل واردة حتى الآن.");
      showEmpty(recentList, "لا توجد رسائل جديدة.");
    } else {
      messages.forEach((message) => allList.append(buildMessageRow(message)));
      messages.slice(0, 4).forEach((message) => recentList.append(buildMessageRow(message, true)));
    }
    updateUnreadCount(messages);
  } catch (error) {
    announce(`تعذر تحميل الرسائل: ${error.message}`, true);
  }
}

async function updateMessage(id, values) {
  const { error } = await client.from("messages").update(values).eq("id", id);
  if (error) {
    announce(`تعذر تحديث الرسالة: ${error.message}`, true);
    return;
  }
  await Promise.all([loadMessages(), refreshOverview()]);
}

async function deleteMessage(id) {
  if (!window.confirm("هل تريد حذف الرسالة نهائياً؟")) return;
  const { error } = await client.from("messages").delete().eq("id", id);
  if (error) {
    announce(`تعذر حذف الرسالة: ${error.message}`, true);
    return;
  }
  announce("تم حذف الرسالة.");
  await Promise.all([loadMessages(), refreshOverview()]);
}

function updateUnreadCount(messages) {
  const unread = messages.filter((message) => !message.is_read).length;
  document.querySelector("#overview-unread").textContent = String(unread);
}

async function refreshOverview() {
  try {
    const [projects, metrics, certificates, skills, messages] = await Promise.all([
      readRows("projects"), readRows("metrics"), readRows("certificates"), readRows("skills"), readRows("messages")
    ]);
    document.querySelector("#overview-projects").textContent = String(projects.length);
    document.querySelector("#overview-metrics").textContent = String(metrics.length);
    document.querySelector("#overview-learning").textContent = String(certificates.length + skills.length);
    updateUnreadCount(messages);
    cachedRows.messages = messages;
    const recentList = document.querySelector("#recent-messages");
    recentList.replaceChildren();
    if (!messages.length) showEmpty(recentList, "لا توجد رسائل جديدة.");
    else messages.slice(0, 4).forEach((message) => recentList.append(buildMessageRow(message, true)));
  } catch (error) {
    announce(`تعذر تحميل ملخص اللوحة: ${error.message}`, true);
  }
}

document.querySelectorAll(".admin-tabs [data-panel]").forEach((tab) => {
  tab.addEventListener("click", () => setPanel(tab.dataset.panel));
});

document.querySelectorAll("[data-open-panel]").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = document.querySelector(`.admin-tabs [data-panel="${button.dataset.openPanel}"]`);
    tab.click();
  });
});

document.querySelectorAll(".records-panel[data-collection]").forEach((panel) => {
  panel.querySelector(".add-record")?.addEventListener("click", () => openEditor(panel.dataset.collection));
  panel.querySelector(".record-editor")?.addEventListener("submit", saveRecord);
});

document.querySelector("#signout-button").addEventListener("click", async () => {
  const { error } = await client.auth.signOut();
  if (error) announce(`تعذر تسجيل الخروج: ${error.message}`, true);
  else showLogin("تم تسجيل الخروج بأمان.");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginFeedback.textContent = "جارٍ التحقق من بيانات الدخول...";
  const formData = new FormData(loginForm);
  const { data, error } = await client.auth.signInWithPassword({
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (error) {
    loginFeedback.textContent = "تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.";
    return;
  }
  if (data.user.email?.toLowerCase() !== config.adminEmail.toLowerCase()) {
    await client.auth.signOut();
    loginFeedback.textContent = "هذا الحساب غير مصرح له بإدارة المحفظة.";
    return;
  }
  await enterAdmin(data.user);
});

async function enterAdmin(user) {
  if (user.email?.toLowerCase() !== config.adminEmail.toLowerCase()) {
    await client.auth.signOut();
    showLogin("هذا الحساب غير مصرح له بإدارة المحفظة.");
    return;
  }
  loginView.hidden = true;
  adminApp.hidden = false;
  document.querySelector("#admin-email-label").textContent = user.email;
  document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("ar-EG", { dateStyle: "full" }).format(new Date());
  await refreshOverview();
  setPanel(activePanel);
}

if (!config || !config.supabaseUrl || config.supabaseUrl.includes("YOUR_PROJECT") || !config.supabaseAnonKey || config.supabaseAnonKey.includes("YOUR_SUPABASE")) {
  showNotice("أكمل إعداد الاتصال أولاً: أضف رابط مشروع Supabase ومفتاح anon في ملف supabase-config.js، ثم نفّذ خطوات SETUP.md.");
} else if (!window.supabase?.createClient) {
  showNotice("تعذر تحميل مكتبة Supabase. تحقق من اتصال الإنترنت أو أعد المحاولة.");
} else {
  client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  loginForm.hidden = false;
  client.auth.getSession().then(({ data, error }) => {
    if (error) showLogin("تعذر استعادة الجلسة. سجّل الدخول مرة أخرى.");
    else if (data.session) enterAdmin(data.session.user);
  });
}