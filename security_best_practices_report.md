# Security Best Practices Report

## Executive Summary

This repository is currently a single static frontend page in [home.html](/home/waqasmir/Projects/vibecode/AIcostcalculator/home.html:1). I did not find a clearly exploitable, user-input-driven XSS in the current implementation, but the page does not establish a strong browser security baseline. The two main issues are the absence of any visible Content Security Policy in the document and continued use of `innerHTML` for DOM updates. Together, these make future XSS introduction easier and increase the impact of any later injection bug.

## Medium Severity

### SBP-001: No visible Content Security Policy and current page structure depends on inline code

- Severity: Medium
- Location: [home.html](/home/waqasmir/Projects/vibecode/AIcostcalculator/home.html:12), [home.html](/home/waqasmir/Projects/vibecode/AIcostcalculator/home.html:168)
- Evidence:

```html
<style>
```

```html
<script>
```

- Impact: If any script injection bug is introduced later, there is no visible CSP in this repo to limit execution, and the current inline script/style structure pushes deployment toward weaker CSP settings such as `unsafe-inline`.
- Fix: Move inline JavaScript into an external file, move inline CSS into an external stylesheet, and deploy a restrictive CSP from the hosting layer or a meta tag if headers are unavailable.
- Mitigation: If hosting controls headers outside this repo, verify production sets a restrictive CSP there. Note that header-based CSP is preferable; there is no evidence of it in this repository.
- False positive notes: CSP may be configured at the CDN/server layer and therefore not be visible here. That should be verified at runtime.

## Low Severity

### SBP-002: `innerHTML` is used for repeated DOM writes in the comparison table

- Severity: Low
- Location: [home.html](/home/waqasmir/Projects/vibecode/AIcostcalculator/home.html:196), [home.html](/home/waqasmir/Projects/vibecode/AIcostcalculator/home.html:202)
- Evidence:

```javascript
tbody.innerHTML = "";
```

```javascript
const row = `<tr>
  <td>${model}</td>
  <td>$${cost.toFixed(6)}</td>
</tr>`;

tbody.innerHTML += row;
```

- Impact: In the current code path, the inserted values come from constants and computed numbers, so this is not an obvious exploitable XSS today. The risk is that `innerHTML` is a dangerous sink and tends to become exploitable when future changes start feeding it URL data, API responses, or user content.
- Fix: Build rows with `document.createElement()` and assign text with `textContent` instead of concatenating HTML strings.
- Mitigation: If `innerHTML` must remain, keep all inserted values strictly derived from trusted constants and validated primitive values, and pair this with a restrictive CSP.
- False positive notes: Based on the current file alone, I do not see attacker-controlled data reaching this sink.

## Informational Notes

### SBP-003: Browser hardening headers are not visible in-repo

- Severity: Low
- Location: [home.html](/home/waqasmir/Projects/vibecode/AIcostcalculator/home.html:1)
- Evidence: No in-document evidence of CSP, `frame-ancestors`, `X-Content-Type-Options`, or related browser hardening headers.
- Impact: Missing browser hardening can increase exposure to clickjacking and content-type confusion, depending on hosting setup.
- Fix: Verify the deployment platform sets the needed headers centrally.
- Mitigation: Prefer header-based controls at the server/CDN layer for static sites.
- False positive notes: These controls are commonly configured outside the repo, so this item should be validated against the live deployment rather than assumed absent.

## Recommended Next Steps

1. Externalize the inline `<script>` and `<style>` blocks so a strict CSP becomes practical.
2. Replace the comparison-table `innerHTML` updates with DOM node creation APIs.
3. Verify production/browser hardening headers at the hosting layer instead of assuming they exist.
