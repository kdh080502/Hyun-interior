const projects = [];
const projectGrid = document.querySelector("#projectGrid");
const filterButtons = document.querySelectorAll(".filter-button");
const menuToggle = document.querySelector("#menuToggle");
const mainNav = document.querySelector("#mainNav");
const supabaseClient = window.supabase?.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

function makeProjectCard(project) {
  const article = document.createElement("article");
  article.className = "project-card";
  const beforeAfter = document.createElement("div");
  beforeAfter.className = "before-after";
  [["BEFORE", project.before_image], ["AFTER", project.after_image]].forEach(([label, url]) => {
    const image = document.createElement("div");
    image.className = "project-image placeholder-visual";
    image.setAttribute("role", "img");
    image.setAttribute("aria-label", `${label} 사진`);
    const tag = document.createElement("span");
    tag.className = "image-tag";
    tag.textContent = label;
    image.appendChild(tag);
    if (url) {
      const photo = document.createElement("img");
      photo.src = url;
      photo.alt = `${project.title || "프로젝트"} ${label} 사진`;
      image.appendChild(photo);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "placeholder-label";
      placeholder.textContent = `${label} 사진 준비 중`;
      image.appendChild(placeholder);
    }
    beforeAfter.appendChild(image);
  });
  const meta = document.createElement("div");
  meta.className = "project-meta";
  const category = document.createElement("span");
  category.textContent = project.category || "분류 미정";
  const year = document.createElement("span");
  year.textContent = project.project_year || "";
  meta.append(category, year);
  const title = document.createElement("h3");
  title.textContent = project.title || "";
  const description = document.createElement("p");
  description.textContent = project.description || "";
  article.append(beforeAfter, meta, title, description);
  return article;
}

function showProjects(filter = "all") {
  projectGrid.replaceChildren();
  const visible = projects.filter(p => filter === "all" || p.category === filter);
  if (!visible.length) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent = "등록된 프로젝트가 없습니다.";
    projectGrid.appendChild(message);
    return;
  }
  visible.forEach(p => projectGrid.appendChild(makeProjectCard(p)));
}

async function loadSiteContent() {
  if (!supabaseClient) {
    showProjects();
    return;
  }
  const [{ data: projectRows, error: projectError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabaseClient.from("projects").select("*").eq("is_published", true).order("sort_order").order("created_at", { ascending: false }),
      supabaseClient.from("site_settings").select("setting_key, setting_value")
    ]);
  if (!projectError && projectRows) {
    projects.splice(0, projects.length, ...projectRows);
  } else if (projectError) console.error("프로젝트를 불러오지 못했습니다.", projectError);
  if (!settingsError && settings) {
    const values = Object.fromEntries(settings.map(row => [row.setting_key, row.setting_value]));
    const contact = {
      phone: "NUMBER", email: "E-MAIL", address: "OFFICE", fax: "FAX"
    };
    document.querySelectorAll(".contact-details > div").forEach(div => {
      const label = div.querySelector("span")?.textContent?.trim();
      const key = Object.keys(contact).find(k => contact[k] === label);
      if (key && values[key]) {
        const button = div.querySelector("button");
        button.textContent = values[key];
        button.dataset.copy = values[key];
      }
    });
    const heroImage = document.querySelector(".hero-main-image");
    if (heroImage) {
      if (values.main_image) {
        heroImage.src = values.main_image.startsWith("http") ? values.main_image :
          supabaseClient.storage.from("site-images").getPublicUrl(values.main_image).data.publicUrl;
        heroImage.hidden = false;
      } else {
        heroImage.hidden = true;
      }
    }
  } else if (settingsError) console.error("사이트 설정을 불러오지 못했습니다.", settingsError);
  const activeFilter = document.querySelector(".filter-button.active")?.dataset.filter || "all";
  showProjects(activeFilter);
}

filterButtons.forEach(button => button.addEventListener("click", () => {
  filterButtons.forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  showProjects(button.dataset.filter);
}));
menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
  menuToggle.textContent = isOpen ? "×" : "☰";
});
mainNav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "메뉴 열기");
  menuToggle.textContent = "☰";
}));
document.querySelector("#year").textContent = new Date().getFullYear();

const themeToggle = document.querySelector("#themeToggle");
const savedTheme = localStorage.getItem("hyun-interior-theme");
function applyTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.setAttribute("aria-label", dark ? "밝은 테마로 전환" : "어두운 테마로 전환");
  themeToggle.title = dark ? "밝은 테마로 전환" : "어두운 테마로 전환";
}
applyTheme(savedTheme === "dark" ? "dark" : "light");
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("hyun-interior-theme", next);
});

const copyFeedback = document.querySelector("#copyFeedback");
document.querySelectorAll(".copy-value").forEach(button => button.addEventListener("click", async () => {
  const value = button.dataset.copy;
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
    else {
      const input = document.createElement("textarea");
      input.value = value; input.style.position = "fixed"; input.style.opacity = "0";
      document.body.appendChild(input); input.select();
      const copied = document.execCommand("copy"); input.remove();
      if (!copied) throw new Error("copy failed");
    }
    copyFeedback.textContent = `${button.parentElement.querySelector("span").textContent} 내용이 복사되었습니다.`;
  } catch {
    copyFeedback.textContent = "복사하지 못했습니다. 내용을 직접 선택해 주세요.";
  }
}));
loadSiteContent();
