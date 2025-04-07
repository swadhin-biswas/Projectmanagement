import {
    FileText,
    History,
    Image,
    Megaphone,
    Search,
    User,
    X
} from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { SEARCH_MODES, getSearchSuggestions } from '../../lib/chatSearchUtils';
import { Badge } from './badge';
import { Button } from './button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from './dropdown-menu';
import { Input } from './input';

export const ChatSearch = ({
  messages,
  recentSearches = [],
  onSearch,
  onClearSearch
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState(SEARCH_MODES.ALL);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef(null);

  const suggestions = getSearchSuggestions(recentSearches, messages);

  const handleSearch = useCallback(() => {
    if (!searchTerm && searchMode === SEARCH_MODES.ALL) {
      onClearSearch();
      return;
    }
    onSearch({ searchTerm, mode: searchMode });
  }, [searchTerm, searchMode, onSearch, onClearSearch]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
      setIsDropdownOpen(false);
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleModeSelect = (mode) => {
    setSearchMode(mode);
    handleSearch();
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setSearchTerm('');
    setSearchMode(SEARCH_MODES.ALL);
    onClearSearch();
  };

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder="Search messages..."
          className="pl-10"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {(searchTerm || searchMode !== SEARCH_MODES.ALL) && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <FileText className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Search Filters</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() => handleModeSelect(SEARCH_MODES.ALL)}
              className="justify-between"
            >
              All Messages
              {searchMode === SEARCH_MODES.ALL && (
                <Badge variant="secondary">Active</Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handleModeSelect(SEARCH_MODES.ANNOUNCEMENTS)}
              className="justify-between"
            >
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Announcements
              </div>
              {searchMode === SEARCH_MODES.ANNOUNCEMENTS && (
                <Badge variant="secondary">Active</Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handleModeSelect(SEARCH_MODES.FILES)}
              className="justify-between"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Files
              </div>
              {searchMode === SEARCH_MODES.FILES && (
                <Badge variant="secondary">Active</Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handleModeSelect(SEARCH_MODES.IMAGES)}
              className="justify-between"
            >
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Images
              </div>
              {searchMode === SEARCH_MODES.IMAGES && (
                <Badge variant="secondary">Active</Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handleModeSelect(SEARCH_MODES.FROM_USER)}
              className="justify-between"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                From User
              </div>
              {searchMode === SEARCH_MODES.FROM_USER && (
                <Badge variant="secondary">Active</Badge>
              )}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          {suggestions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Searches
              </DropdownMenuLabel>
              {suggestions.map((suggestion, index) => (
                <DropdownMenuItem
                  key={index}
                  onSelect={() => {
                    setSearchTerm(suggestion);
                    handleSearch();
                  }}
                >
                  {suggestion}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};