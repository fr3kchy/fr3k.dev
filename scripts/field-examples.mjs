import { validateForgeEvidence } from "./validate-forge-evidence.mjs";

const run = validateForgeEvidence();

function forgeResult() {
  return `<div class="field-example-grid">
    <figure class="sample-figure">
      <a href="${run.image}"><img src="${run.image}" width="${run.width}" height="${run.height}" alt="Red cube with a shadowed left face on a grey studio surface" decoding="async"></a>
      <figcaption>Original PNG · external Nightmare renderer · <time datetime="${run.date}">19 November 2026</time></figcaption>
    </figure>
    <div><p class="eyebrow">Measured on hardware</p><h2>One cube in ${run.elapsed_including_fetch_seconds} seconds.</h2>
    <p>${run.device} generated this image through the installed Nightmare API. The elapsed time includes fetching the image on the host.</p>
    <dl class="receipt-list">
      <div><dt>Renderer</dt><dd>${run.renderer}</dd></div>
      <div><dt>Model</dt><dd>AbsoluteReality</dd></div>
      <div><dt>Output</dt><dd>${run.width} × ${run.height} px</dd></div>
      <div><dt>Seed / steps</dt><dd>${run.seed} / ${run.steps}</dd></div>
      <div><dt>Run response</dt><dd>${run.run_response_seconds} s</dd></div>
      <div><dt>Including fetch</dt><dd>${run.elapsed_including_fetch_seconds} s</dd></div>
    </dl>
    <p><strong>Prompt</strong> “${run.prompt}”</p>
    <p class="sample-note">End-to-end Forge UI acceptance is pending. The next run must start in Forge and return its image to the same interface.</p>
    <a class="btn" href="/data/evidence/nightmare-redmagic.json">Inspect run receipt (JSON)</a></div>
  </div>`;
}

const operations = `<p class="eyebrow">Fictional pilot walkthrough</p><h2>Follow one shift into a payroll draft.</h2>
<p>A fictional workshop uses one shift to rehearse a pay-period handoff. All times and records below are invented.</p>
<ol class="pilot-steps">
  <li><strong>Roster the shift.</strong> A coordinator assigns a workshop shift from 08:00 to 16:00 with a 30-minute unpaid break.</li>
  <li><strong>Reconcile attendance.</strong> The worker records a 16:15 finish. The extra quarter-hour goes to a supervisor for review.</li>
  <li><strong>Approve the timesheet.</strong> The supervisor checks the finish time and break, then approves 7 hours 45 minutes for the draft.</li>
  <li><strong>Prepare the handoff.</strong> A payroll reviewer compares the draft hours with the approved shift record and checks the applicable pay rules before export.</li>
</ol><p class="sample-note">The walkthrough ends at human review. Live tenant reconciliation, payroll sign-off and payment remain outside this pilot.</p>`;

const fleet = `<p class="eyebrow">Sanitized example receipt</p><h2>What came back from the device?</h2>
<p>This fictional receipt illustrates how an operator could review a read-only check. The labels and values are illustrative.</p>
<dl class="receipt-list">
  <div><dt>Request</dt><dd>Inspect available storage</dd></div>
  <div><dt>Target</dt><dd>Demo handset</dd></div>
  <div><dt>Approval scope</dt><dd>One read-only inspection</dd></div>
  <div><dt>Expected result</dt><dd>Return a storage reading with units</dd></div>
  <div><dt>Example response</dt><dd>18 GiB available</dd></div>
  <div><dt>Postcondition</dt><dd>Storage value and unit present</dd></div>
</dl><p class="sample-note">A reviewer can compare the request, permission and returned measurement. This sample contains no live device data.</p>`;

export function fieldExample(project) {
  const content = { forge: forgeResult, operations: () => operations, fleet: () => fleet }[project.id];
  return content ? `<section id="field-example" class="section field-example"><div class="shell">${content()}</div></section>` : "";
}
