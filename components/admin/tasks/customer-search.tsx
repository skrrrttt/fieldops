'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Customer } from '@/lib/database.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Building2, Plus } from 'lucide-react';

interface CustomerSearchProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  onQuickAddClick: () => void;
}

export function CustomerSearch({ customers, selectedCustomer, onCustomerSelect, onQuickAddClick }: CustomerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.contact_name?.toLowerCase().includes(query) ||
        c.contact_email?.toLowerCase().includes(query) ||
        c.contact_phone?.toLowerCase().includes(query) ||
        c.address?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const handleCustomerClick = (customer: Customer) => {
    onCustomerSelect(customer);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onCustomerSelect(null);
    setSearchQuery('');
  };

  if (selectedCustomer) {
    return (
      <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-foreground">{selectedCustomer.name}</span>
          {selectedCustomer.contact_name && (
            <p className="text-sm text-muted-foreground">{selectedCustomer.contact_name}</p>
          )}
          {selectedCustomer.address && (
            <p className="text-sm text-muted-foreground truncate">{selectedCustomer.address}</p>
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
          placeholder="Search for a customer..."
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
              Add new customer...
            </span>
          </button>

          {filteredCustomers.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No customers match your search' : 'No customers yet'}
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => handleCustomerClick(customer)}
                className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted border-b border-border text-left last:border-b-0"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center mt-0.5">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {customer.name}
                  </span>
                  {customer.contact_name && (
                    <p className="text-xs text-muted-foreground">{customer.contact_name}</p>
                  )}
                  {customer.address && (
                    <p className="text-xs text-muted-foreground truncate">{customer.address}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
