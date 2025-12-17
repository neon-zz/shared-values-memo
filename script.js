/* ================================
  共有価値観メモ（Firestore版）
================================ */

/* ===== Firebase 初期化 ===== */
const firebaseConfig = {
  apiKey: "ここにAPI_KEY",
  authDomain: "xxxxx.firebaseapp.com",
  projectId: "xxxxx",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ===== 状態 ===== */
let items = [];
let currentUser = localStorage.getItem("user"); // nana / rei

/* ===== DOM ===== */
const categoriesEl = document.getElementById("categories");
const searchEl = document.getElementById("search");
const filterEl = document.getElementById("filter");
const backBtn = document.getElementById("backBtn");
const addArea = document.getElementById("addArea");

/* ===== ユーザー選択 ===== */
function setUser(user) {
  currentUser = user;
  localStorage.setItem("user", user);
  document.getElementById("userSelect").style.display = "none";
}

window.onload = () => {
  if (currentUser) {
    document.getElementById("userSelect").style.display = "none";
  }
};

/* ================================
  Firestore 読み込み（最重要）
================================ */
db.collection("values")
  .orderBy("updatedAt", "desc")
  .onSnapshot(snapshot => {
    items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    render();
  });

/* ================================
  Firestore 保存
================================ */
function saveToFirestore(item) {
  return db.collection("values")
    .doc(item.id)
    .set(item, { merge: true });
}

/* ================================
  質問追加
================================ */
document.getElementById("add").onclick = async () => {
  const category = document.getElementById("category").value;
  const question = document.getElementById("question").value.trim();
  if (!question) return alert("質問を入力してね");

  const item = {
    category,
    question,
    answers: { nana: "", rei: "" },
    updatedAt: Date.now()
  };

  await db.collection("values").add(item);

  document.getElementById("question").value = "";
};

/* ================================
  描画
================================ */
function render() {
  categoriesEl.innerHTML = "";

  const hash = new URLSearchParams(location.hash.slice(1));
  const currentCategory = hash.get("category");

  addArea.style.display = currentCategory ? "none" : "block";
  backBtn.style.display = currentCategory ? "block" : "none";

  let filtered = [...items];

  if (currentCategory) {
    const cat = decodeURIComponent(currentCategory);
    filtered = filtered.filter(i => i.category === cat);
  }

  filtered.forEach(item => {
    categoriesEl.appendChild(card(item));
  });
}

/* ================================
  カード
================================ */
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

  /* 質問クリックで開閉 */
  div.querySelector(".question").onclick = () => {
    div.classList.toggle("open");
  };

  /* 回答 */
  div.querySelector(".edit-a").onclick = async () => {
    if (!currentUser) return alert("ユーザーを選んでね");

    const label = currentUser === "nana" ? "なな" : "レイ";
    const t = prompt(`${label}の回答`, item.answers[currentUser]);
    if (t === null) return;

    item.answers[currentUser] = t.trim();
    item.updatedAt = Date.now();

    await saveToFirestore(item);
  };

  /* 削除 */
  div.querySelector(".delete").onclick = async () => {
    if (!confirm("削除する？")) return;
    await db.collection("values").doc(item.id).delete();
  };

  return div;
}

/* 戻る */
backBtn.onclick = () => location.hash = "";
