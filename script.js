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
let searchWord = "";
let filterUser = "";

/* ===== DOM ===== */
const categoriesEl = document.getElementById("categories");
const backBtn = document.getElementById("backBtn");
const addArea = document.getElementById("addArea");
const searchInput = document.getElementById("search");
const filterSelect = document.getElementById("filter");

searchInput.addEventListener("input", () => {
  searchWord = searchInput.value.trim();
  render();
});

filterSelect.addEventListener("change", () => {
  filterUser = filterSelect.value;
  render();
});


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

  /* ===== 今日の1問 ===== */
  const todayBox = document.getElementById("todayBox");
  const todayQ = document.getElementById("todayQuestion");
  const todayBtn = document.getElementById("todayAnswerBtn");

  const todayItem = pickTodayQuestion();

  // カテゴリを開いていない時だけ表示
  if (todayItem && !location.hash) {
    todayBox.style.display = "block";
    todayQ.textContent = "Q：" + todayItem.question;

    todayBtn.onclick = async () => {
      const t = prompt("回答", todayItem.answers[currentUser] || "");
      if (t === null) return;

      todayItem.answers[currentUser] = t;
      todayItem.updatedAt = Date.now();

      await db.collection("values").doc(todayItem.id).set(todayItem);
    };
  } else {
    todayBox.style.display = "none";
  }

  // URLの #category を取得
  const hash = new URLSearchParams(location.hash.slice(1));
  const currentCategory = hash.get("category");

  /* ===== 表示切り替え ===== */
  addArea.style.display = currentCategory ? "none" : "block";
  backBtn.style.display = currentCategory ? "block" : "none";

/* ===== カテゴリページ ===== */
if (currentCategory) {
  const catName = decodeURIComponent(currentCategory);

  // ★ カテゴリタグ描画
  renderCategoryTabs(catName);

  items
    .filter(item => {
      // カテゴリ一致
      if (item.category !== catName) return false;

      // 🔍 検索
      if (searchWord && !item.question.includes(searchWord)) {
        return false;
      }

      // 👤 未回答フィルター
      if (filterUser === "nana" && item.answers.nana) return false;
      if (filterUser === "rei" && item.answers.rei) return false;

      return true;
    })
    .forEach(item => {
      categoriesEl.appendChild(card(item));
    });

  return;
}

  /* ===== 一覧ページ（フォルダUI） ===== */
  const grouped = {};
  items.forEach(i => {
    grouped[i.category] ||= [];
    grouped[i.category].push(i);
  });

Object.keys(grouped).forEach(cat => {
  const list = grouped[cat];

  // 未回答数を数える
  const unansweredCount = list.filter(item =>
    !item.answers.nana || !item.answers.rei
  ).length;

  const folder = document.createElement("div");
  folder.className = "folder";

  const header = document.createElement("div");
  header.className = "folder-header";

  header.innerHTML = `
    <span>
      ${cat}（${list.length}）
      <span class="folder-unanswered">
        未回答：${unansweredCount}
      </span>
    </span>
    <button class="open-btn" data-cat="${cat}">開く</button>
  `;

  // iPhone用ボタン
  header.querySelector(".open-btn").onclick = () => {
    location.hash = `category=${encodeURIComponent(cat)}`;
  };

  folder.appendChild(header);
  categoriesEl.appendChild(folder);
});
}

/* ===== カード ===== */
function card(item) {
  const div = document.createElement("div");
  div.className = "card";

    if (!item.answers.nana && !item.answers.rei) {
    div.classList.add("both-unanswered");
  } else if (!item.answers.nana || !item.answers.rei) {
    div.classList.add("has-unanswered");
  }

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

function renderCategoryTabs(activeCat) {
  const tabsEl = document.getElementById("categoryTabs");
  tabsEl.innerHTML = "";

  // 全カテゴリ取得（重複なし）
  const categories = [...new Set(items.map(i => i.category))];

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "category-tab";
    if (cat === activeCat) btn.classList.add("active");

    btn.textContent = cat;

    btn.onclick = () => {
      location.hash = `category=${encodeURIComponent(cat)}`;
    };

    tabsEl.appendChild(btn);
  });
}

/* 戻る */
backBtn.onclick = () => location.hash = "";

// URLの # が変わったら再描画
window.addEventListener("hashchange", () => {
  render();
});

// 今日の一問
function pickTodayQuestion() {
  if (!currentUser) return null;

  // 未回答の質問だけ
  const unanswered = items.filter(item => {
    return !item.answers[currentUser];
  });

  if (unanswered.length === 0) return null;

  // ランダム1問
  return unanswered[Math.floor(Math.random() * unanswered.length)];
}