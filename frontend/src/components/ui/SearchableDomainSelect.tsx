import React, { useState, useRef, useEffect } from 'react';
import { Layers, Search, ChevronDown, Check, X, Plus } from 'lucide-react';

interface SearchableDomainSelectProps {
  domains: string[];
  selectedDomain: string;
  onChange: (domain: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
}

export const SearchableDomainSelect: React.FC<SearchableDomainSelectProps> = ({
  domains,
  selectedDomain,
  onChange,
  placeholder = 'Search & select domain...',
  showAllOption = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDomains = domains.filter(d =>
    d.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleSelect = (domain: string) => {
    onChange(domain);
    setIsOpen(false);
    setSearchQuery('');
  };

  const isExactMatch = domains.some(d => d.toLowerCase() === searchQuery.trim().toLowerCase());

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {/* Selected Box / Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 transition shadow-sm hover:bg-slate-100/70 text-left relative"
      >
        <Layers className="w-4 h-4 text-indigo-500 absolute left-3 top-3.5" />
        <span className={`truncate mr-2 ${selectedDomain ? 'text-slate-900 font-extrabold' : 'text-slate-400 font-medium'}`}>
          {selectedDomain ? selectedDomain : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedDomain && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Popover Menu with Live Search Filter */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Input Filter */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type to filter engineering domains..."
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
            {/* Optional "All Domains" Option */}
            {showAllOption && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition ${
                  !selectedDomain
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
                }`}
              >
                <span>All Domains</span>
                {!selectedDomain && <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
              </button>
            )}

            {filteredDomains.length > 0 ? (
              filteredDomains.map(domain => {
                const isSelected = selectedDomain === domain;
                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => handleSelect(domain)}
                    className={`w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
                    }`}
                  >
                    <span className="truncate">{domain}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 ml-2" />}
                  </button>
                );
              })
            ) : null}

            {/* Custom Domain Option */}
            {searchQuery.trim() !== '' && !isExactMatch && (
              <button
                type="button"
                onClick={() => handleSelect(searchQuery.trim())}
                className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Use custom domain: "{searchQuery.trim()}"</span>
              </button>
            )}

            {filteredDomains.length === 0 && searchQuery.trim() === '' && (
              <div className="p-4 text-center text-xs text-slate-400 font-semibold">
                No matching domains found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
