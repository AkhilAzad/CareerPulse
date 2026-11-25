import React from 'react';
import {
  Code2,
  Palette,
  Sparkles,
  Server,
  Layers,
  TrendingUp,
  ShieldCheck,
  Users,
  ArrowRight,
  Check,
} from 'lucide-react';
import { CATEGORIES } from '../data/mockData';

const iconMap = {
  Code2: Code2,
  Palette: Palette,
  Sparkles: Sparkles,
  Server: Server,
  Layers: Layers,
  TrendingUp: TrendingUp,
  ShieldCheck: ShieldCheck,
  Users: Users,
};

export default function PopularCategories({ selectedCategory, onSelectCategory }) {
  return (
    <section id="categories" className="categories-section">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">High-Growth Sectors</div>
          <h2 className="section-title">Explore Popular Job Categories</h2>
          <p className="section-subtitle">
            Browse through hundreds of specialized career tracks. Click any category to filter
            matching opportunities.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="categories-grid">
          {CATEGORIES.map((category) => {
            const IconComponent = iconMap[category.iconName] || Code2;
            const isSelected = selectedCategory === category.id;

            return (
              <div
                key={category.id}
                className={`category-card ${isSelected ? 'category-card-active' : ''}`}
                onClick={() => onSelectCategory(isSelected ? 'all' : category.id)}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${category.name}${isSelected ? ' (active filter)' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectCategory(isSelected ? 'all' : category.id);
                  }
                }}
              >
                <div className="category-top">
                  <div
                    className="category-icon-box"
                    style={{
                      backgroundColor: category.bgColor,
                      color: category.color,
                    }}
                  >
                    <IconComponent size={24} />
                  </div>
                  {isSelected ? (
                    <span className="category-active-pill">
                      <Check size={12} /> Active
                    </span>
                  ) : (
                    <span className="category-count-badge">{category.tag || 'Explore'}</span>
                  )}
                </div>

                <h3 className="category-name">{category.name}</h3>
                <p className="category-desc">{category.description}</p>

                <div className="category-footer">
                  <span className="category-action-link">
                    {isSelected ? 'Selected Category' : 'Explore Openings'}
                    <ArrowRight size={14} className="category-arrow-icon" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
