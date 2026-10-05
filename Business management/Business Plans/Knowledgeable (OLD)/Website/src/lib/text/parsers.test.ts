import { describe, expect, it } from 'vitest';
import { parseJats } from '@/lib/text/jats';
import { parseWikipediaHtml } from '@/lib/text/wikipedia';
import { normaliseSections } from '@/lib/text/sections';

const JATS = `<?xml version="1.0"?>
<article>
  <front>
    <journal-meta><journal-title-group><journal-title>Learning &amp; Memory</journal-title></journal-title-group></journal-meta>
    <article-meta>
      <article-id pub-id-type="doi">10.1000/xyz123</article-id>
      <title-group><article-title>Spacing <italic>improves</italic> recall</article-title></title-group>
      <contrib-group>
        <contrib contrib-type="author"><name><surname>Smith</surname><given-names>Ana</given-names></name></contrib>
        <contrib contrib-type="editor"><name><surname>Editor</surname><given-names>Ed</given-names></name></contrib>
      </contrib-group>
      <pub-date><year>2021</year></pub-date>
      <abstract><p>We tested spacing.</p></abstract>
    </article-meta>
  </front>
  <body>
    <sec><title>Introduction</title><p>Memory fades <xref>[1]</xref>.</p>
      <sec><title>Background</title><p>Ebbinghaus measured it.</p></sec>
      <fig><label>Figure 1</label><caption><p>The forgetting curve.</p></caption></fig>
    </sec>
    <sec><title>Methods</title><p>Forty students.</p><list><list-item><p>Group A</p></list-item></list></sec>
  </body>
  <back><ref-list><ref>Should not appear</ref></ref-list></back>
</article>`;

describe('parseJats', () => {
  const paper = parseJats(JATS);

  it('reads metadata', () => {
    expect(paper.title).toBe('Spacing improves recall');
    expect(paper.authors).toEqual(['Ana Smith']);
    expect(paper.journal).toBe('Learning & Memory');
    expect(paper.year).toBe('2021');
    expect(paper.doi).toBe('10.1000/xyz123');
    expect(paper.abstract).toEqual(['We tested spacing.']);
  });

  it('turns body sections into reader sections with in-line sub-headings and captions', () => {
    expect(paper.sections.map((s) => s.heading)).toEqual(['Introduction', 'Methods']);
    expect(paper.sections[0].paragraphs).toEqual(['Memory fades [1].', 'Background', 'Ebbinghaus measured it.', '[Figure 1: The forgetting curve.]']);
    expect(paper.sections[1].paragraphs).toEqual(['Forty students.', '• Group A']);
    expect(JSON.stringify(paper)).not.toContain('Should not appear');
  });
});

describe('parseWikipediaHtml', () => {
  const html = `<div class="mw-parser-output">
    <table class="infobox"><tr><td>Infobox</td></tr></table>
    <p>Stoicism is a school of philosophy.<sup class="reference">[1]</sup></p>
    <div class="mw-heading mw-heading2"><h2>History</h2><span class="mw-editsection">edit</span></div>
    <p>Founded by Zeno.</p>
    <h3>Later Stoics</h3>
    <ul><li>Seneca</li><li>Epictetus</li></ul>
    <h2>References</h2>
    <p>Cite this.</p>
  </div>`;

  it('keeps the readable text and stops at the references', () => {
    expect(parseWikipediaHtml(html)).toEqual([
      { heading: 'Overview', paragraphs: ['Stoicism is a school of philosophy.'] },
      { heading: 'History', paragraphs: ['Founded by Zeno.', 'Later Stoics', '• Seneca', '• Epictetus'] },
    ]);
  });
});

describe('normaliseSections', () => {
  it('folds very short sections into the next one', () => {
    const long = Array(100).fill('word').join(' ');
    const sections = normaliseSections([
      { heading: 'Funding', paragraphs: ['None.'] },
      { heading: 'Results', paragraphs: [long] },
    ], true);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Results');
    expect(sections[0].body.startsWith('Funding\n\nNone.')).toBe(true);
  });
});
