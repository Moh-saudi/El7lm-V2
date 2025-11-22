import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/index';
import { ChevronDown, Menu, X } from 'lucide-react';
import React, { useState } from 'react';

interface MobileNavigationProps {
  items: Array<{
    label: string;
    href?: string;
    icon?: React.ReactNode;
    children?: Array<{
      label: string;
      href: string;
      icon?: React.ReactNode;
    }>;
  }>;
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  items,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (label: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedItems(newExpanded);
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <div className={cn('lg:hidden', className)}>
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <span>القائمة</span>
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={closeMenu}>
          <div
            className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">القائمة</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeMenu}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <nav className="space-y-2">
                {items.map((item, index) => (
                  <div key={index}>
                    {item.children ? (
                      <div>
                        <Button
                          variant="ghost"
                          className="w-full justify-between"
                          onClick={() => toggleExpanded(item.label)}
                        >
                          <div className="flex items-center gap-2">
                            {item.icon}
                            <span>{item.label}</span>
                          </div>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform',
                              expandedItems.has(item.label) && 'rotate-180'
                            )}
                          />
                        </Button>

                        {expandedItems.has(item.label) && (
                          <div className="ml-4 mt-2 space-y-1">
                            {item.children.map((child, childIndex) => (
                              <Button
                                key={childIndex}
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={closeMenu}
                              >
                                <div className="flex items-center gap-2">
                                  {child.icon}
                                  <span>{child.label}</span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={closeMenu}
                      >
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                      </Button>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNavigation;
