/**
 * Safe date formatting helper for Case Study documents.
 * Prevents "Invalid Date" errors across all pages and components.
 */
export function formatCaseStudyDate(caseStudy: any): string {
  if (!caseStudy) return 'Recently Published';

  const dateVal =
    caseStudy.published_at ||
    caseStudy.publishedAt ||
    caseStudy.created_at ||
    caseStudy.createdAt ||
    caseStudy.updated_at ||
    caseStudy.updatedAt;

  if (!dateVal) return 'Recently Published';

  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'Recently Published';

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
