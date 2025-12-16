/* ================================
  共有価値観メモ
  - 一覧ページ（フォルダUI）
  - カテゴリページ（#category=〇〇）
  - 未回答フィルター
  - 編集 / 削除
================================ */

/* ===== データ読み込み ===== */
let items = JSON.parse(localStorage.getItem("values")) || [];

/* ===== DOM取得 ===== */
const categoriesEl = document.getElementById("categories");
const searchEl = document.getElementById("search");
const filterEl = document.getElementById("filter");
const categorySelect = document.getElementById("category");
const categoryOtherInput = document.getElementById("categoryOther");
const questionInput = document.getElementById("question");
const backBtn = document.getElementById("backBtn");
const addArea = document.getElementById("addArea");

/* ユーティリティ */

// 全カテゴリ取得（重複なし）
function getAllCategories() {
  return [...new Set(items.map(i => i.category))];
}

// 保存
function save() {
  localStorage.setItem("values", JSON.stringify(items));
}

/* その他カテゴリ切り替え */
categorySelect.onchange = () => {
  categoryOtherInput.style.display =
    categorySelect.value === "__other__" ? "block" : "none";
};

/* 質問追加 */
document.getElementById("add").onclick = () => {
  let category = categorySelect.value;
  const question = questionInput.value.trim();

  if (!question) return alert("質問を入力してね");

  if (category === "__other__") {
    category = categoryOtherInput.value.trim();
    if (!category) return alert("カテゴリ名を入力してね");
  }

  items.push({
    id: crypto.randomUUID(),
    category,
    question,
    answers: { nana: "", rei: "" },
    updatedAt: Date.now()
  });

  save();
  // フォーム初期化
  questionInput.value = "";
  categoryOtherInput.value = "";
  categoryOtherInput.style.display = "none";
  categorySelect.value = "食事";

  render();
};

/* ===== イベント ===== */
searchEl.oninput = render;
filterEl.onchange = render;
window.onhashchange = render;

/* ===== 描画 ===== */
function render() {
  categoriesEl.innerHTML = "";

  const word = searchEl.value.trim();
  const filter = filterEl.value;

  // URLの #category を取得
  const hash = new URLSearchParams(location.hash.slice(1));
  const currentCategory = hash.get("category");

  /* ===== UI表示切替 ===== */
  addArea.style.display = currentCategory ? "none" : "block";
  backBtn.style.display = currentCategory ? "block" : "none";

  let filtered = [...items];

  /* ===== キーワード検索 ===== */
  if (word) {
    filtered = filtered.filter(i =>
      i.category.includes(word) ||
      i.question.includes(word) ||
      i.answers.nana.includes(word) ||
      i.answers.rei.includes(word)
    );
  }

  /* ===== 未回答フィルター ===== */
  filtered = filtered.filter(i => {
    if (filter === "nana") return !i.answers.nana;
    if (filter === "rei") return !i.answers.rei;
    if (filter === "any") return !i.answers.nana || !i.answers.rei;
    return true;
  }); 

  /* ===== カテゴリページ ===== */
  if (currentCategory) {
    const categoryName = decodeURIComponent(currentCategory);

    /* --- カテゴリ移動ナビ --- */
    const nav = document.createElement("div");
    nav.className = "category-nav";

    getAllCategories().forEach(cat => {
      const btn = document.createElement("a");
      btn.href = `#category=${encodeURIComponent(cat)}`;
      btn.textContent = cat;
      btn.className = cat === categoryName
        ? "cat-btn active": "cat-btn";
      nav.appendChild(btn);
    });

    categoriesEl.appendChild(nav);

    /* --- カテゴリタイトル --- */
    const title = document.createElement("h2");
    title.className = "category-title";
    title.textContent = categoryName;
    categoriesEl.appendChild(title);

  // カードのみ
    filtered
      .filter(i => i.category === categoryName)
      .forEach(i => categoriesEl.appendChild(card(i)));

    return;
  }

  /*  一覧ページ */
  const grouped = {};
  filtered.forEach(i => {
    grouped[i.category] ||= [];
    grouped[i.category].push(i);
  });

  Object.keys(grouped).forEach(cat => {
    const folder = document.createElement("div");
    folder.className = "folder";

    const header = document.createElement("div");
    header.className = "folder-header";
    header.innerHTML = `
      <span>${cat}（${grouped[cat].length}）</span>
      <a href="#category=${encodeURIComponent(cat)}">開く</a>
    `;

    const body = document.createElement("div");
    body.className = "folder-body";

    grouped[cat].forEach(i => body.appendChild(card(i)));

    folder.append(header, body);
    categoriesEl.appendChild(folder);
  });
}

/* カード1件 */
function card(item) {
  const div = document.createElement("div");
  div.className = "card";

  /* ===== 未回答判定 ===== */
  const nanaEmpty = !item.answers.nana;
  const reiEmpty  = !item.answers.rei;

  if (nanaEmpty || reiEmpty) div.classList.add("has-unanswered");
  if (nanaEmpty && reiEmpty) div.classList.add("both-unanswered");

div.innerHTML = `
 <div class="card-top">
      <!-- ▼ 質問（クリック対象） -->
      <div class="question clickable">
        Q：${item.question}
      </div>

      <div class="actions">
        <button class="edit-a">回答</button>
        <button class="delete">削除</button>
      </div>
    </div>

 <!-- ▼ 回答（最初は非表示） -->
    <div class="answers">
      <div class="answer-box answer-nana">
        ${item.answers.nana || "<span class='muted'>未入力</span>"}
      </div>

      <div class="answer-box answer-rei">
        ${item.answers.rei || "<span class='muted'>未入力</span>"}
      </div>
    </div>
  `;

  /* ===== 質問クリックで開閉 ===== */
  div.querySelector(".question").onclick = () => {
    div.classList.toggle("open");
  };

   /* ===== 回答者選択 ===== */
  div.querySelector(".edit-a").onclick = () => {
    const who = prompt(
      "誰の回答を編集しますか？\n\n1：私（なな）\n2：レイ",
      "1"
    );
    if (who === null) return;

    if (who === "1") {
      const t = prompt("ななの回答", item.answers.nana);
      if (t !== null) item.answers.nana = t.trim();
    }

    if (who === "2") {
      const t = prompt("レイの回答", item.answers.rei);
      if (t !== null) item.answers.rei = t.trim();
    }

    item.updatedAt = Date.now();
    save();
    render();
  };

  /* ===== 削除 ===== */
  div.querySelector(".delete").onclick = () => {
    if (confirm("削除する？")) {
      items = items.filter(x => x.id !== item.id);
      save();
      render();
    }
  };

  return div;
}

/* 一覧に戻  */
backBtn.onclick = () => {
  location.hash = "";
};

/* 初期描画 */
render();
