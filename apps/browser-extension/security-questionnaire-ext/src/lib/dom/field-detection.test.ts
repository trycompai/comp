import { describe, expect, it } from 'vitest';
import { detectQuestionFields } from './field-detection';

describe('detectQuestionFields', () => {
  it('extracts a question from an associated label', () => {
    document.body.innerHTML = `
      <label for="encrypt">Do you encrypt customer data at rest?</label>
      <textarea id="encrypt"></textarea>
    `;

    const fields = detectQuestionFields(document, { visibleOnly: false });

    expect(fields).toHaveLength(1);
    expect(fields[0].question).toBe('Do you encrypt customer data at rest?');
  });

  it('extracts a question from table-row context', () => {
    document.body.innerHTML = `
      <table>
        <tr>
          <td>Describe your incident response process.</td>
          <td><input type="text" /></td>
        </tr>
      </table>
    `;

    const fields = detectQuestionFields(document, { visibleOnly: false });

    expect(fields).toHaveLength(1);
    expect(fields[0].question).toBe('Describe your incident response process.');
  });

  it('extracts a question from Google Forms list-item context', () => {
    document.body.innerHTML = `
      <div role="listitem">
        <div>Describe your business continuity testing.</div>
        <textarea></textarea>
      </div>
    `;

    const fields = detectQuestionFields(document, { visibleOnly: false });

    expect(fields).toHaveLength(1);
    expect(fields[0].question).toBe('Describe your business continuity testing.');
  });

  it('ignores generic Google Forms input labels', () => {
    document.body.innerHTML = `
      <div role="listitem">
        <div>Do you require MFA for administrator access?</div>
        <input type="text" aria-label="Short answer" />
      </div>
    `;

    const fields = detectQuestionFields(document, { visibleOnly: false });

    expect(fields).toHaveLength(1);
    expect(fields[0].question).toBe('Do you require MFA for administrator access?');
  });

  it('ignores password and hidden inputs', () => {
    document.body.innerHTML = `
      <label>Password <input type="password" /></label>
      <input type="hidden" value="secret" />
    `;

    const fields = detectQuestionFields(document, { visibleOnly: false });

    expect(fields).toHaveLength(0);
  });

  it('ignores generic app fields that are not questionnaire prompts', () => {
    document.body.innerHTML = `
      <label for="issue">Issue description</label>
      <textarea id="issue"></textarea>
    `;

    const fields = detectQuestionFields(document, { visibleOnly: false });

    expect(fields).toHaveLength(0);
  });

  it('keeps security questionnaire prompts without question marks', () => {
    document.body.innerHTML = `
      <label for="policy">Information security policy and access control overview</label>
      <textarea id="policy"></textarea>
    `;

    const fields = detectQuestionFields(document, { visibleOnly: false });

    expect(fields).toHaveLength(1);
    expect(fields[0].question).toBe('Information security policy and access control overview');
  });

  it('ignores chat composer prompts', () => {
    document.body.innerHTML = `
      <form class="chat-composer">
        <div>How can I help you today?</div>
        <div contenteditable="true" role="textbox" aria-label="Prompt input"></div>
      </form>
    `;

    const fields = detectQuestionFields(document, { visibleOnly: false });

    expect(fields).toHaveLength(0);
  });

  it('ignores search fields even when the placeholder is phrased as a question', () => {
    document.body.innerHTML = `
      <form role="search">
        <input type="text" placeholder="What are you looking for?" />
      </form>
    `;

    const fields = detectQuestionFields(document, { visibleOnly: false });

    expect(fields).toHaveLength(0);
  });
});
