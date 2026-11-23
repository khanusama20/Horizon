/**
 * Predefined Sample LLM Engineering Course
 * Enables 1-click instantaneous demo population during contest judging
 * Guaranteed 100% offline, zero network requests, zero Udemy dependency.
 */

export const SAMPLE_LLM_COURSE_SECTIONS = [
  'Foundations and First Projects',
  'Frontier APIs and Customer Service Chatbots',
  'Embracing Open-Source Models',
  'LLM Selection and Code Generation',
  'Retrieval-Augmented Generation (RAG)',
  'Transitioning to Training & Fine-Tuning',
  'Advanced Training Techniques',
  'Deployment and Finalization'
];

export const SAMPLE_LLM_COURSE = {
  title: 'Complete LLM Engineering Course',
  description: 'Master AI, Frontier APIs, RAG Architectures, Fine-Tuning, and Open-Source Models in 15 days.',
  category: 'Learning',
  totalDays: 15,
  templateId: 'alpine-peak',
  exportPreset: 'MOBILE_1080x1920',
  courseMetadata: {
    sourceUrl: 'https://www.udemy.com/course/llm-engineering-master-ai-and-large-language-models/',
    sourceType: 'UDEMY',
    title: 'Complete LLM Engineering Course',
    author: 'Horizon AI Curriculum Team',
    totalSections: 8,
    totalLectures: 52,
    durationHours: 14.5,
    rawSections: [...SAMPLE_LLM_COURSE_SECTIONS],
    extractedAt: new Date().toISOString()
  }
};

/**
 * Returns a fresh Goal object populated with the Sample LLM Course data
 * @param {object} [existingGoal] - Optional existing goal to preserve ID/createdAt
 * @returns {object} Populated goal
 */
export function createSampleLlmGoal(existingGoal = null) {
  const targetDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: existingGoal?.id || `goal-sample-${Date.now()}`,
    title: SAMPLE_LLM_COURSE.title,
    description: SAMPLE_LLM_COURSE.description,
    category: SAMPLE_LLM_COURSE.category,
    targetDate,
    totalDays: SAMPLE_LLM_COURSE.totalDays,
    templateId: existingGoal?.templateId || SAMPLE_LLM_COURSE.templateId,
    exportPreset: existingGoal?.exportPreset || SAMPLE_LLM_COURSE.exportPreset,
    courseMetadata: {
      ...SAMPLE_LLM_COURSE.courseMetadata,
      extractedAt: new Date().toISOString()
    },
    milestones: [], // Kept empty for Block 3 milestone planning
    streakDays: 1,
    createdAt: existingGoal?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
