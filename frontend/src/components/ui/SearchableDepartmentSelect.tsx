import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Building, Search, ChevronDown, Check } from 'lucide-react';
import { MASTER_DEPARTMENTS } from '../../constants/departments';

interface Department {
  department_id: number | string;
  department_name: string;
  department_code?: string;
}

interface SearchableDepartmentSelectProps {
  departments?: Department[];
  selectedId: number | string;
  onChange: (departmentId: number | string) => void;
  placeholder?: string;
}

export const SearchableDepartmentSelect: React.FC<SearchableDepartmentSelectProps> = ({
  departments = [],
  selectedId,
  onChange,
  placeholder = 'Select your department'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build dropdown list strictly from MASTER_DEPARTMENTS in exact order 1..20
  const activeDepartments = useMemo<Department[]>(() => {
    const apiMap = new Map<number, Department>();
    if (departments && departments.length > 0) {
      departments.forEach(d => {
        const numId = Number(d.department_id);
        if (!isNaN(numId)) {
          apiMap.set(numId, d);
        }
      });
    }

    return MASTER_DEPARTMENTS.map(master => {
      const match = apiMap.get(master.department_id);
      return match || {
        department_id: master.department_id,
        department_name: master.department_name,
        department_code: master.department_code
      };
    });
  }, [departments]);

  const selectedDepartment = activeDepartments.find(
    d => String(d.department_id) === String(selectedId) ||
         d.department_name.toLowerCase() === String(selectedId).toLowerCase()
  );

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

  const filteredDepartments = activeDepartments.filter(d =>
    d.department_name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    (d.department_code && d.department_code.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  );

  const handleSelect = (dept: Department) => {
    onChange(dept.department_id);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Selected Box / Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 transition shadow-sm hover:bg-slate-100/60 text-left relative"
      >
        <Building className="w-5 h-5 text-indigo-500 absolute left-3 top-3" />
        <span className={`truncate mr-2 ${selectedDepartment ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'}`}>
          {selectedDepartment ? selectedDepartment.department_name : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu with Live Search Filter */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Input Filter */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type to search department..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Filtered Department Options List */}
          <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
            {filteredDepartments.length > 0 ? (
              filteredDepartments.map(dept => {
                const isSelected = String(dept.department_id) === String(selectedId) || dept.department_name === selectedId;
                return (
                  <button
                    key={dept.department_id}
                    type="button"
                    onClick={() => handleSelect(dept)}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
                    }`}
                  >
                    <span className="truncate">{dept.department_name}</span>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0 ml-2" />}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 font-semibold">
                No matching departments found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
