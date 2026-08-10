import Link from 'next/link';
import { CaseStudy } from '@/lib/types/case-study';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, Star, Building2 } from 'lucide-react';

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
}

export function CaseStudyCard({ caseStudy }: CaseStudyCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full overflow-hidden group">
      <div className="p-6 flex-1 flex flex-col">
        {/* Top Header: Industry Badge & Featured Indicator */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {caseStudy.industry ? (
            <span className="inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              <Building2 className="w-3 h-3 mr-1 text-blue-500" />
              {caseStudy.industry}
            </span>
          ) : (
            <span className="text-xs text-gray-400 font-medium">General Case Study</span>
          )}

          {caseStudy.featured && (
            <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-500" />
              Featured
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/case-studies/${caseStudy.slug}`}>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
            {caseStudy.title}
          </h3>
        </Link>

        {/* Short Description */}
        <p className="mt-2.5 text-sm text-gray-600 line-clamp-3 leading-relaxed flex-1">
          {caseStudy.description || 'No summary description provided.'}
        </p>

        {/* Technologies & Services */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          {caseStudy.services && caseStudy.services.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {caseStudy.services.slice(0, 3).map((service, idx) => (
                <Badge key={idx} variant="purple">
                  {service}
                </Badge>
              ))}
              {caseStudy.services.length > 3 && (
                <span className="text-xs text-gray-400 font-medium self-center">
                  +{caseStudy.services.length - 3} more
                </span>
              )}
            </div>
          )}

          {caseStudy.technologies && caseStudy.technologies.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {caseStudy.technologies.slice(0, 4).map((tech, idx) => (
                <Badge key={idx} variant="gray">
                  {tech}
                </Badge>
              ))}
              {caseStudy.technologies.length > 4 && (
                <span className="text-xs text-gray-400 font-medium self-center">
                  +{caseStudy.technologies.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        {caseStudy.tags && caseStudy.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {caseStudy.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="px-6 py-3.5 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between mt-auto">
        <span className="text-xs text-gray-400 font-medium">
          PDF Ready
        </span>
        <Link
          href={`/case-studies/${caseStudy.slug}`}
          className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span>View Case Study</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
