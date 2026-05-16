/* =========================================================
   THE TOKEN LEDGER · app.js
   ========================================================= */

// ---- Model catalog (USD per million tokens, May 2026) ----
const MODELS = [
    {
        id: "claude-opus-4-7",
        name: "Claude Opus 4.7",
        provider: "Anthropic",
        tier: "flagship",
        input: 5.0,
        output: 25.0,
        tag: "FLAG",
    },
    {
        id: "claude-sonnet-4-6",
        name: "Claude Sonnet 4.6",
        provider: "Anthropic",
        tier: "mid",
        input: 3.0,
        output: 15.0,
    },
    {
        id: "claude-haiku-4-5",
        name: "Claude Haiku 4.5",
        provider: "Anthropic",
        tier: "fast",
        input: 1.0,
        output: 5.0,
        tag: "FAST",
    },
    {
        id: "gpt-5-4",
        name: "GPT-5.4",
        provider: "OpenAI",
        tier: "flagship",
        input: 1.75,
        output: 14.0,
        tag: "FLAG",
    },
    {
        id: "gpt-5-2",
        name: "GPT-5.2",
        provider: "OpenAI",
        tier: "mid",
        input: 1.75,
        output: 14.0,
    },
    {
        id: "gemini-3-1-pro",
        name: "Gemini 3.1 Pro",
        provider: "Google",
        tier: "flagship",
        input: 2.0,
        output: 12.0,
        tag: "FLAG",
    },
    {
        id: "gemini-3-flash",
        name: "Gemini 3 Flash",
        provider: "Google",
        tier: "fast",
        input: 0.5,
        output: 3.0,
        tag: "FAST",
    },
    {
        id: "grok-4-1",
        name: "Grok 4.1",
        provider: "xAI",
        tier: "mid",
        input: 0.2,
        output: 0.5,
    },
];

const TIER_ORDER = { flagship: 0, mid: 1, fast: 2 };

// ---- Currency table (approximate, May 2026) ----
const CURRENCIES = {
    USD: { symbol: "$", rate: 1, decimals: 6 },
    EUR: { symbol: "€", rate: 0.92, decimals: 6 },
    GBP: { symbol: "£", rate: 0.79, decimals: 6 },
    INR: { symbol: "₹", rate: 84.5, decimals: 4 },
    PKR: { symbol: "₨", rate: 278, decimals: 3 },
    JPY: { symbol: "¥", rate: 156, decimals: 3 },
};

// ---- DOM refs ----
const $ = (id) => document.getElementById(id);
const inputTokens = $("inputTokens");
const outputTokens = $("outputTokens");
const inputMeta = $("inputMeta");
const outputMeta = $("outputMeta");
const modelSelect = $("model");
const useCache = $("useCache");
const cacheSlider = $("cacheSlider");
const cacheRatio = $("cacheRatio");
const cacheRatioVal = $("cacheRatioVal");
const useBatch = $("useBatch");
const requestsInput = $("requests");
const currencySelect = $("currency");
const resultEl = $("result");
const breakdownEl = $("breakdown");
const insightEl = $("insight");
const perDayEl = $("perDay");
const perDayMeta = $("perDayMeta");
const perMonthEl = $("perMonth");
const perYearEl = $("perYear");
const per1KEl = $("per1K");
const per1MEl = $("per1M");
const splitPctEl = $("splitPct");
const comparisonBody = $("comparison");
const estimateText = $("estimateText");
const estimateOut = $("estimateOut");
const useAsInputBtn = $("useAsInput");
const useAsOutputBtn = $("useAsOutput");
const todayDateEl = $("todayDate");
const sortBtns = document.querySelectorAll(".sort-btn");

// ---- State ----
let currentSort = "cost";

// ---- Initial setup ----
function populateModels() {
    // Group by provider in select
    const providers = [...new Set(MODELS.map((m) => m.provider))];
    providers.forEach((prov) => {
        const group = document.createElement("optgroup");
        group.label = prov;
        MODELS.filter((m) => m.provider === prov).forEach((m) => {
            const opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.name;
            group.appendChild(opt);
        });
        modelSelect.appendChild(group);
    });
    modelSelect.value = "claude-sonnet-4-6";
}

function setDate() {
    const d = new Date();
    const opts = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
    todayDateEl.textContent = d.toLocaleDateString("en-US", opts);
}

// ---- Core math ----
function getCostUSD(model, inTok, outTok) {
    const cacheOn = useCache.checked;
    const batchOn = useBatch.checked;
    const cachePct = cacheOn ? Number(cacheRatio.value) / 100 : 0;

    // Cached input billed at 10% of input rate (90% off)
    const cachedTokens = inTok * cachePct;
    const freshTokens = inTok * (1 - cachePct);

    let inputCost = freshTokens * model.input + cachedTokens * model.input * 0.1;
    let outputCost = outTok * model.output;

    let total = (inputCost + outputCost) / 1e6;

    if (batchOn) total *= 0.5;

    return {
        total,
        inputCost: (batchOn ? inputCost * 0.5 : inputCost) / 1e6,
        outputCost: (batchOn ? outputCost * 0.5 : outputCost) / 1e6,
    };
}

function formatCurrency(usd, opts = {}) {
    const cur = CURRENCIES[currencySelect.value];
    const val = usd * cur.rate;
    const decimals = opts.decimals ?? cur.decimals;

    if (val === 0) return `${cur.symbol}0`;

    // For large numbers, use commas and fewer decimals
    if (val >= 1000) {
        return `${cur.symbol}${val.toLocaleString("en-US", {
            maximumFractionDigits: 2,
        })}`;
    }
    if (val >= 1) {
        return `${cur.symbol}${val.toFixed(2)}`;
    }
    if (val >= 0.01) {
        return `${cur.symbol}${val.toFixed(4)}`;
    }
    return `${cur.symbol}${val.toFixed(decimals)}`;
}

function formatTokens(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "K";
    return String(n);
}

function tokensToWords(n) {
    // Rough: 1 token ≈ 0.75 word
    return Math.round(n * 0.75);
}

// ---- Render ----
function updateMetas() {
    const inT = Number(inputTokens.value) || 0;
    const outT = Number(outputTokens.value) || 0;
    inputMeta.textContent = `≈ ${tokensToWords(inT).toLocaleString()} words`;
    outputMeta.textContent = `≈ ${tokensToWords(outT).toLocaleString()} words`;
}

function getSelectedModel() {
    return MODELS.find((m) => m.id === modelSelect.value);
}

function renderPrimaryResult() {
    const model = getSelectedModel();
    const inT = Number(inputTokens.value) || 0;
    const outT = Number(outputTokens.value) || 0;
    const { total, inputCost, outputCost } = getCostUSD(model, inT, outT);

    // Main result
    resultEl.textContent = formatCurrency(total);
    resultEl.classList.remove("flash");
    void resultEl.offsetWidth;
    resultEl.classList.add("flash");
    setTimeout(() => resultEl.classList.remove("flash"), 250);

    // Breakdown
    breakdownEl.innerHTML = `
        <span class="bd-item"><span class="bd-label">in</span><span class="bd-value">${formatCurrency(inputCost)}</span></span>
        <span class="bd-item"><span class="bd-label">out</span><span class="bd-value">${formatCurrency(outputCost)}</span></span>
        <span class="bd-item"><span class="bd-label">model</span><span class="bd-value">${model.name}</span></span>
    `;

    // Insight (varied, contextual)
    insightEl.textContent = buildInsight(total, inT, outT, model);

    // Volume cards
    const reqs = Math.max(0, Number(requestsInput.value) || 0);
    perDayEl.textContent = formatCurrency(total * reqs);
    perDayMeta.textContent = `${reqs.toLocaleString()} request${reqs === 1 ? "" : "s"}`;
    perMonthEl.textContent = formatCurrency(total * reqs * 30);
    perYearEl.textContent = formatCurrency(total * reqs * 365);

    // Rate strip
    const totalTokens = inT + outT;
    per1KEl.textContent =
        totalTokens > 0 ? formatCurrency((total * 1000) / totalTokens) : "—";
    per1MEl.textContent =
        totalTokens > 0
            ? formatCurrency((total * 1e6) / totalTokens)
            : "—";
    splitPctEl.textContent =
        total > 0
            ? `${Math.round((inputCost / total) * 100)}% / ${Math.round((outputCost / total) * 100)}%`
            : "—";
}

function buildInsight(total, inT, outT, model) {
    if (inT === 0 && outT === 0) return "Enter some tokens to see the cost.";

    const cacheNote = useCache.checked
        ? ` Caching ${cacheRatio.value}% of input.`
        : "";
    const batchNote = useBatch.checked ? " Batch pricing applied." : "";

    if (total < 1e-6) {
        return `Effectively free at this scale.${cacheNote}${batchNote}`;
    }
    if (total < 0.001) {
        return `Less than a tenth of a cent per request — vanishingly cheap.${cacheNote}${batchNote}`;
    }
    if (total < 0.01) {
        return `Under a cent per request. A million calls would run ${formatCurrency(total * 1e6)}.${cacheNote}${batchNote}`;
    }
    if (total < 1) {
        return `${formatCurrency(total)} per call. At a million requests, that's ${formatCurrency(total * 1e6)}.${cacheNote}${batchNote}`;
    }
    return `${formatCurrency(total)} per call is substantial — consider a smaller model or shorter outputs.${cacheNote}${batchNote}`;
}

function renderComparison() {
    const inT = Number(inputTokens.value) || 0;
    const outT = Number(outputTokens.value) || 0;
    const selected = getSelectedModel();
    const selectedCost = getCostUSD(selected, inT, outT).total;

    let rows = MODELS.map((m) => ({
        model: m,
        cost: getCostUSD(m, inT, outT).total,
    }));

    // Sort
    if (currentSort === "cost") {
        rows.sort((a, b) => a.cost - b.cost);
    } else if (currentSort === "provider") {
        rows.sort(
            (a, b) =>
                a.model.provider.localeCompare(b.model.provider) ||
                a.cost - b.cost,
        );
    } else if (currentSort === "tier") {
        rows.sort(
            (a, b) =>
                TIER_ORDER[a.model.tier] - TIER_ORDER[b.model.tier] ||
                a.cost - b.cost,
        );
    }

    const maxCost = Math.max(...rows.map((r) => r.cost), 1e-12);
    const minCost = Math.min(...rows.map((r) => r.cost));

    comparisonBody.innerHTML = "";
    rows.forEach(({ model, cost }) => {
        const tr = document.createElement("tr");
        if (model.id === selected.id) tr.classList.add("selected");
        if (cost === minCost && rows.length > 1) tr.classList.add("cheapest");

        const pct = maxCost > 0 ? (cost / maxCost) * 100 : 0;
        const delta = cost - selectedCost;
        let deltaText, deltaClass;
        if (model.id === selected.id) {
            deltaText = "—";
            deltaClass = "same";
        } else if (Math.abs(delta) < 1e-9) {
            deltaText = "same";
            deltaClass = "same";
        } else if (delta < 0) {
            const factor = selectedCost > 0 ? selectedCost / cost : 0;
            deltaText = `${factor.toFixed(1)}× cheaper`;
            deltaClass = "cheaper";
        } else {
            const factor = cost / Math.max(selectedCost, 1e-12);
            deltaText = `${factor.toFixed(1)}× pricier`;
            deltaClass = "pricier";
        }

        const tagHtml = model.tag
            ? `<span class="model-tag ${model.tag === "FLAG" ? "flag" : "fast"}">${model.tag}</span>`
            : "";

        tr.innerHTML = `
            <td><span class="model-name">${model.name}</span>${tagHtml}</td>
            <td class="provider-cell">${model.provider}</td>
            <td class="rate-cell">$${model.input.toFixed(2)} / $${model.output.toFixed(2)}</td>
            <td class="cost-cell">${formatCurrency(cost)}</td>
            <td class="bar-cell"><div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div></td>
            <td class="delta-cell ${deltaClass}">${deltaText}</td>
        `;
        comparisonBody.appendChild(tr);
    });
}

function render() {
    updateMetas();
    renderPrimaryResult();
    renderComparison();
}

// ---- Event wiring ----
function wireEvents() {
    [
        inputTokens,
        outputTokens,
        modelSelect,
        requestsInput,
        currencySelect,
        cacheRatio,
    ].forEach((el) => el.addEventListener("input", render));

    useCache.addEventListener("change", () => {
        cacheSlider.classList.toggle("active", useCache.checked);
        render();
    });

    useBatch.addEventListener("change", render);

    cacheRatio.addEventListener("input", () => {
        cacheRatioVal.textContent = cacheRatio.value + "%";
    });

    // Quick-set buttons
    document.querySelectorAll(".quick-set").forEach((group) => {
        const target = group.dataset.target;
        group.querySelectorAll("button").forEach((btn) => {
            btn.addEventListener("click", () => {
                $(target).value = btn.dataset.val;
                render();
            });
        });
    });

    // Sort buttons
    sortBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            sortBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentSort = btn.dataset.sort;
            renderComparison();
        });
    });

    // Estimator
    estimateText.addEventListener("input", () => {
        const text = estimateText.value;
        const tokens = Math.ceil(text.length / 4);
        estimateOut.textContent = `${tokens.toLocaleString()} token${tokens === 1 ? "" : "s"}`;
    });
    useAsInputBtn.addEventListener("click", () => {
        const tokens = Math.ceil(estimateText.value.length / 4);
        inputTokens.value = tokens;
        render();
    });
    useAsOutputBtn.addEventListener("click", () => {
        const tokens = Math.ceil(estimateText.value.length / 4);
        outputTokens.value = tokens;
        render();
    });

    // Prevent negative numbers on blur
    [inputTokens, outputTokens, requestsInput].forEach((el) => {
        el.addEventListener("blur", () => {
            if (Number(el.value) < 0 || el.value === "") el.value = 0;
        });
    });
}

// ---- Boot ----
populateModels();
setDate();
wireEvents();
render();
