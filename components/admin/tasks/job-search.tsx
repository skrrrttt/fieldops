'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { JobWithCustomer } from '@/lib/database.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Building2, MapPin, Plus } from 'lucide-react';

interface JobSearchProps {
  jobs: JobWithCustomer[];
  selectedJob: JobWithCustomer | null;
  onJobSelect: (job: JobWithCustomer | null) => void;
  onQuickAddClick: () => void;
}

export function JobSearch({ jobs, selectedJob, onJobSelect, onQuickAddClick }: JobSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter jobs by search query
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;

    const query = searchQuery.toLowerCase();
    return jobs.filter(
      (job) =>
        job.name.toLowerCase().includes(query) ||
        job.address?.toLowerCase().includes(query) ||
        job.customer.name.toLowerCase().includes(query)
    );
  }, [jobs, searchQuery]);

  // Group filtered jobs by customer
  const groupedJobs = useMemo(() => {
    const groups: Record<string, { customer: JobWithCustomer['customer']; jobs: JobWithCustomer[] }> = {};

    filteredJobs.forEach((job) => {
      const customerId = job.customer.id;
      if (!groups[customerId]) {
        groups[customerId] = {
          customer: job.customer,
          jobs: [],
        };
      }
      groups[customerId].jobs.push(job);
    });

    return Object.values(groups).sort((a, b) => a.customer.name.localeCompare(b.customer.name));
  }, [filteredJobs]);

  const handleJobClick = (job: JobWithCustomer) => {
    onJobSelect(job);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onJobSelect(null);
    setSearchQuery('');
  };

  // If a job is selected, show the selected job card
  if (selectedJob) {
    return (
      <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{selectedJob.name}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="w-3 h-3" />
            {selectedJob.customer.name}
          </div>
          {selectedJob.address && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">{selectedJob.address}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-shrink-0 h-8 w-8 p-0"
          onClick={handleClear}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search for a job or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {/* Quick add option */}
          <button
            type="button"
            onClick={() => {
              onQuickAddClick();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted border-b border-border text-left"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">
              Add new customer & job...
            </span>
          </button>

          {/* Search results */}
          {groupedJobs.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No jobs match your search' : 'No jobs available'}
            </div>
          ) : (
            groupedJobs.map((group) => (
              <div key={group.customer.id}>
                {/* Customer header */}
                <div className="px-3 py-2 bg-muted border-b border-border">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    {group.customer.name}
                  </div>
                </div>
                {/* Jobs under this customer */}
                {group.jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => handleJobClick(job)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 pl-6 hover:bg-muted border-b border-border text-left last:border-b-0"
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">
                        {job.name}
                      </span>
                      {job.address && (
                        <p className="text-xs text-muted-foreground truncate">{job.address}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
