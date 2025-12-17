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
const searchEl = document.getElementById("search");
const filterEl = document.getElementById("filter");
const backBtn = document.getElementById("backBtn");
const addArea = document.getElementById("addArea");

/* ===== ユーザー管理 ===== */

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
  if (!currentUser) {
    select.style.display = "flex";
  } else {
    select.style.display = "none";
  }
};

/* ================================
  Firestore 読み込み（最重要）
================================ */
db.collection("values").onSnapshot(snap => {
  items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  const area = document.getElementById("categories");
  area.innerHTML = "";

  items.forEach(item => {
    const div = document.createElement("div");
    div.innerHTML = `
      <div>Q：${item.question}</div>
      <div>なな：${item.answers?.nana || "未回答"}</div>
      <div>レイ：${item.answers?.rei || "未回答"}</div>
      <button>回答</button>
    `;
    div.querySelector("button").onclick = async () => {
      if (!currentUser) return alert("ユーザー選んでね");
      const t = prompt("回答", item.answers[currentUser]);
      if (t === null) return;
      item.answers[currentUser] = t;
      await db.collection("values").doc(item.id).set(item);
    };
    area.appendChild(div);
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

  /* 削除 */
  div.querySelector(".delete").onclick = async () => {
    if (!confirm("削除する？")) return;
    await db.collection("values").doc(item.id).delete();
  };

  return div;
}

/* 戻る */
backBtn.onclick = () => location.hash = "";
