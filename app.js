const models = {
    "gpt-4o": { input: 5 / 1e6, output: 15 / 1e6 },
    "gpt-4o-mini": { input: 0.15 / 1e6, output: 0.6 / 1e6 },
};

const inputTokens = document.getElementById("inputTokens");
const outputTokens = document.getElementById("outputTokens");
const modelSelect = document.getElementById("model");
const result = document.getElementById("result");
const insight = document.getElementById("insight");
const comparison = document.getElementById("comparison");

function createCell(text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    return cell;
}

function renderComparisonTable(input, output) {
    comparison.replaceChildren();

    Object.entries(models).forEach(([modelName, rates]) => {
        const row = document.createElement("tr");
        const cost = input * rates.input + output * rates.output;

        row.append(createCell(modelName), createCell(`$${cost.toFixed(6)}`));
        comparison.appendChild(row);
    });
}

function calculate() {
    const input = Number.parseInt(inputTokens.value, 10) || 0;
    const output = Number.parseInt(outputTokens.value, 10) || 0;
    const selectedModel = modelSelect.value;
    const rates = models[selectedModel];

    if (!rates) {
        result.textContent = "$0.000000";
        insight.textContent = "Select a valid model to calculate pricing.";
        comparison.replaceChildren();
        return;
    }

    const total = input * rates.input + output * rates.output;

    result.textContent = `$${total.toFixed(6)}`;
    insight.textContent =
        total < 0.01
            ? "This request costs less than a cent."
            : `Scaling this to 1M requests could cost $${(total * 1_000_000).toFixed(0)}`;

    renderComparisonTable(input, output);
}

document.querySelectorAll("input, select").forEach((element) => {
    element.addEventListener("input", calculate);
});

calculate();
