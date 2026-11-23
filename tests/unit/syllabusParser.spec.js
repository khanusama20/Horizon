import { describe, it, expect } from 'vitest';
import { parseSyllabusText } from '../../src/services/syllabusParser.js';

describe('Syllabus Text Parser (Block 2 MVP)', () => {
  it('MVP-SP-01: parses standard numbered outlines', () => {
    const raw = `1. Intro to AI\n2. Neural Nets\n3. Transformers`;
    const result = parseSyllabusText(raw);
    expect(result).toEqual(['Intro to AI', 'Neural Nets', 'Transformers']);
  });

  it('MVP-SP-02: parses markdown bulleted lists and headers', () => {
    const raw = `- Module A: RAG\n* Module B: Agents\n+ Module C: Fine-tuning\n### Module D: Deployment`;
    const result = parseSyllabusText(raw);
    expect(result).toEqual([
      'Module A: RAG',
      'Module B: Agents',
      'Module C: Fine-tuning',
      'Module D: Deployment'
    ]);
  });

  it('MVP-SP-03: parses Roman numerals and cleans duration timestamps', () => {
    const raw = `Section I: Foundations of LLMs (45 mins)\nSection II: Prompt Engineering [1 hr 30 mins]\nPart III: Fine-Tuning - 2 hours`;
    const result = parseSyllabusText(raw);
    expect(result).toEqual([
      'Foundations of LLMs',
      'Prompt Engineering',
      'Fine-Tuning'
    ]);
  });

  it('MVP-SP-04: filters boilerplate headers and empty lines', () => {
    const raw = `
      Course Content
      Syllabus
      1. First Project
      
      Table of Contents
      2. Second Project
    `;
    const result = parseSyllabusText(raw);
    expect(result).toEqual(['First Project', 'Second Project']);
  });

  it('MVP-SP-05: handles empty, null, or whitespace-only inputs without crashing', () => {
    expect(parseSyllabusText('')).toEqual([]);
    expect(parseSyllabusText('   \n  \n  ')).toEqual([]);
    expect(parseSyllabusText(null)).toEqual([]);
    expect(parseSyllabusText(undefined)).toEqual([]);
  });

  it('MVP-SP-06: deduplicates consecutive identical lines', () => {
    const raw = `1. Foundations\n1. Foundations\n2. Next Steps`;
    const result = parseSyllabusText(raw);
    expect(result).toEqual(['Foundations', 'Next Steps']);
  });
});
