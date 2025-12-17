/* ================================
  共有価値観メモ（Firestore版）
================================ */

/* ===== Firebase 初期化 ===== */
const firebaseConfig = {
  apiKey: "AIzaSyCDG1H71ESjGJQ5NV25Tc7NYBBfUDw",
  authDomain: "shared-values-memo.firebaseapp.com",
  projectId: "shared-values-memo",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ===== 状態 ===== */
let items = [];
let currentUser = localStorage.getItem("user"); // nana / rei

/* ===== DOM ===== */
const categoriesEl = document.getElementById("categories");
const backBtn = document.getElementById("backBtn");
const addArea = document.getElementById("addArea");

// ユーザー選択時に呼ばれる
window.setUser = function(user) {
  currentUser = user;
  localStorage.setItem("user", user);
  document.getElementById("userSelect").style.display = "none";
  render();
};

// ページ読み込み時
window.onload = () => {
  const select = document.getElementById("userSelect");
  select.style.display = currentUser ? "none" : "flex";
};

/* ===== Firestore 読み込み ===== */
db.collection("values")
  .orderBy("updatedAt", "desc")
  .onSnapshot(snapshot => {
    items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    render();
  });

/* ===== 質問追加 ===== */
document.getElementById("add").onclick = async () => {
  const category = document.getElementById("category").value;
  const question = document.getElementById("question").value.trim();
  if (!question) return alert("質問を入力してね");

  await db.collection("values").add({
    category,
    question,
    answers: { nana: "", rei: "" },
    updatedAt: Date.now()
  });

  document.getElementById("question").value = "";
};

/* ===== 描画 ===== */
function render() {
    categoriesEl.innerHTML = "";

  // URLの #category を取得
  const hash = new URLSearchParams(location.hash.slice(1));
  const currentCategory = hash.get("category");

  /* ===== 表示切り替え ===== */
  addArea.style.display = currentCategory ? "none" : "block";
  backBtn.style.display = currentCategory ? "block" : "none";

/* ===== カテゴリページ ===== */
if (currentCategory) {
  const catName = decodeURIComponent(currentCategory);

  items
    .filter(i => i.category === catName) // ← 修正ポイント
    .forEach(item => categoriesEl.appendChild(card(item)));
  return;
}

  /* ===== 一覧ページ（フォルダUI） ===== */
  const grouped = {};
  items.forEach(i => {
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

  folder.appendChild(header);
  categoriesEl.appendChild(folder);
});
}

/* ===== カード ===== */
function card(item) {
  const div = document.createElement("div");
  div.className = "card";

  div.innerHTML = `
    <div class="card-top">
      <div class="question clickable">Q：${item.question}</div>
      <div class="actions">
        <button class="edit-a">回答</button>
        <button class="delete">削除</button>
      </div>
    </div>

    <div class="answers">
      <div class="answer-box answer-nana">
        ${item.answers.nana || "<span class='muted'>未入力</span>"}
      </div>
      <div class="answer-box answer-rei">
        ${item.answers.rei || "<span class='muted'>未入力</span>"}
      </div>
    </div>
  `;

  /* 開閉 */
  div.querySelector(".question").onclick = () => {
    div.classList.toggle("open");
  };

/* 回答 */
div.querySelector(".edit-a").onclick = async () => {
  if (!currentUser) return alert("ユーザーを選んでね");
  const t = prompt("回答", item.answers[currentUser]);
  if (t === null) return;

  item.answers[currentUser] = t;
  item.updatedAt = Date.now();
  await db.collection("values").doc(item.id).set(item);
};

/* 削除 */
div.querySelector(".delete").onclick = async () => {
  if (!confirm("この質問を削除する？")) return;
  await db.collection("values").doc(item.id).delete();
};

  return div;
}

/* 戻る */
backBtn.onclick = () => location.hash = "";

// URLの # が変わったら再描画
window.addEventListener("hashchange", () => {
  render();
});
