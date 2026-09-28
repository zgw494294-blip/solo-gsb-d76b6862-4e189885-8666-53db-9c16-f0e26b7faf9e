// LED 混光配方台 前端逻辑

const channelList = document.getElementById("channel-list");
const addBtn = document.getElementById("add-channel");
const solveBtn = document.getElementById("solve-btn");
const resultEmpty = document.getElementById("result-empty");
const resultContent = document.getElementById("result-content");
const resultError = document.getElementById("result-error");

let channelSeq = 0;

function makeChannelRow(ch) {
  const row = document.createElement("div");
  row.className = "channel-row";
  row.innerHTML = `
    <input type="text" class="ch-id" value="${ch.id}" placeholder="ID">
    <label>R<input type="number" class="ch-r" min="0" max="1000" step="1" value="${ch.r}"></label>
    <label>G<input type="number" class="ch-g" min="0" max="1000" step="1" value="${ch.g}"></label>
    <label>B<input type="number" class="ch-b" min="0" max="1000" step="1" value="${ch.b}"></label>
    <label>功率(mW)<input type="number" class="ch-power" min="1" max="10000" step="1" value="${ch.power}"></label>
    <button class="btn danger remove-btn">删</button>
  `;
  row.querySelector(".remove-btn").addEventListener("click", () => {
    row.remove();
  });
  return row;
}

function addChannel(ch) {
  channelList.appendChild(makeChannelRow(ch));
}

function defaultChannel() {
  channelSeq += 1;
  return { id: `LED${channelSeq}`, r: 100, g: 100, b: 100, power: 1000 };
}

// 初始化 3 路
for (let i = 0; i < 3; i++) addChannel(defaultChannel());

addBtn.addEventListener("click", () => {
  if (channelList.children.length >= 6) return;
  addChannel(defaultChannel());
});

// 从 DOM 读取通道数据（求解时读取，保证最新）
function readChannels() {
  const rows = channelList.querySelectorAll(".channel-row");
  const out = [];
  rows.forEach((row) => {
    out.push({
      id: row.querySelector(".ch-id").value.trim(),
      r: parseInt(row.querySelector(".ch-r").value, 10),
      g: parseInt(row.querySelector(".ch-g").value, 10),
      b: parseInt(row.querySelector(".ch-b").value, 10),
      power: parseInt(row.querySelector(".ch-power").value, 10),
    });
  });
  return out;
}

function readTarget() {
  return {
    r: parseInt(document.getElementById("target-r").value, 10),
    g: parseInt(document.getElementById("target-g").value, 10),
    b: parseInt(document.getElementById("target-b").value, 10),
  };
}

function readTolerance() {
  return parseInt(document.getElementById("tolerance").value, 10);
}

function validate(channels, target, tolerance) {
  if (channels.length < 3 || channels.length > 6) {
    return "通道数必须为 3～6 路";
  }
  const ids = channels.map((c) => c.id);
  if (ids.some((id) => !id)) return "通道 ID 不能为空";
  if (new Set(ids).size !== ids.length) return "通道 ID 必须唯一";
  for (const c of channels) {
    if (!Number.isInteger(c.r) || c.r < 0 || c.r > 1000)
      return `通道 ${c.id} 的 R 必须为 0～1000 整数`;
    if (!Number.isInteger(c.g) || c.g < 0 || c.g > 1000)
      return `通道 ${c.id} 的 G 必须为 0～1000 整数`;
    if (!Number.isInteger(c.b) || c.b < 0 || c.b > 1000)
      return `通道 ${c.id} 的 B 必须为 0～1000 整数`;
    if (c.r === 0 && c.g === 0 && c.b === 0)
      return `通道 ${c.id} 的满档 RGB 读数不全为零`;
    if (!Number.isInteger(c.power) || c.power < 1 || c.power > 10000)
      return `通道 ${c.id} 的功率必须为 1～10000 mW 整数`;
  }
  for (const [k, v] of Object.entries(target)) {
    if (!Number.isInteger(v) || v < 0 || v > 1000)
      return `目标 ${k.toUpperCase()} 必须为 0～1000 整数`;
  }
  if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 20)
    return "容差必须为 0～20 整数";
  return null;
}

// sRGB 传递函数：线性值（0～1）→ sRGB 分量
function linearToSrgb(c) {
  if (c <= 0.0031308) return 12.92 * c;
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function toCssColor(r, g, b) {
  const rr = Math.round(linearToSrgb(Math.max(0, Math.min(1, r / 1000))) * 255);
  const gg = Math.round(linearToSrgb(Math.max(0, Math.min(1, g / 1000))) * 255);
  const bb = Math.round(linearToSrgb(Math.max(0, Math.min(1, b / 1000))) * 255);
  return `rgb(${rr}, ${gg}, ${bb})`;
}

function showError(msg) {
  resultEmpty.hidden = true;
  resultContent.hidden = true;
  resultError.hidden = false;
  resultError.textContent = msg;
}

function showResult(data, target) {
  resultEmpty.hidden = true;
  resultError.hidden = true;
  resultContent.hidden = false;

  document.getElementById("target-swatch").style.background = toCssColor(
    target.r, target.g, target.b
  );
  document.getElementById("actual-swatch").style.background = toCssColor(
    data.actual.r, data.actual.g, data.actual.b
  );

  document.getElementById("target-values").textContent =
    `R:${target.r}  G:${target.g}  B:${target.b}`;
  document.getElementById("actual-values").textContent =
    `R:${data.actual.r.toFixed(2)}  G:${data.actual.g.toFixed(2)}  B:${data.actual.b.toFixed(2)}`;

  const errR = data.actual.r - target.r;
  const errG = data.actual.g - target.g;
  const errB = data.actual.b - target.b;
  document.getElementById("error-values").textContent =
    `R:${errR >= 0 ? "+" : ""}${errR.toFixed(2)}  G:${errG >= 0 ? "+" : ""}${errG.toFixed(2)}  B:${errB >= 0 ? "+" : ""}${errB.toFixed(2)}`;

  document.getElementById("power-value").textContent = data.power_mw.toFixed(2);

  const tbody = document.querySelector("#drives-table tbody");
  tbody.innerHTML = "";
  data.drives.forEach((d) => {
    const tr = document.createElement("tr");
    const tdId = document.createElement("td");
    tdId.textContent = d.id;
    const tdVal = document.createElement("td");
    tdVal.textContent = d.value;
    tr.appendChild(tdId);
    tr.appendChild(tdVal);
    tbody.appendChild(tr);
  });
}

solveBtn.addEventListener("click", async () => {
  const channels = readChannels();
  const target = readTarget();
  const tolerance = readTolerance();

  const err = validate(channels, target, tolerance);
  if (err) {
    showError(err);
    return;
  }

  solveBtn.disabled = true;
  solveBtn.textContent = "求解中…";
  try {
    const resp = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channels, target, tolerance }),
    });
    if (!resp.ok) {
      let msg = `请求失败（HTTP ${resp.status}）`;
      try {
        const j = await resp.json();
        if (j.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
      } catch (e) { /* ignore */ }
      showError(msg);
      return;
    }
    const data = await resp.json();
    if (data.status === "infeasible") {
      showError(data.message || "无解");
      return;
    }
    showResult(data, target);
  } catch (e) {
    showError("请求失败：" + e.message);
  } finally {
    solveBtn.disabled = false;
    solveBtn.textContent = "求解配方";
  }
});
