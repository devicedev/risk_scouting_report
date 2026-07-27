import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus } from 'lucide-react';

export interface DisplayItem<T> {
  id: number;
  name: string;
  originalItem: T;
}

interface AddItemDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: T[];
  existingItemIds: Set<string>;
  onAddItem: (item: T) => void;
  title: string;
  description: string;
  searchPlaceholder: string;
  noItemsMessage: string;
  noResultsMessage: string;
  getId: (item: T) => number;
  getName: (item: T) => string;
}

const AddItemDialog = <T,>({
  open,
  onOpenChange,
  items,
  existingItemIds,
  onAddItem,
  title,
  description,
  searchPlaceholder,
  noItemsMessage,
  noResultsMessage,
  getId,
  getName
}: AddItemDialogProps<T>) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter(item => {
    const itemId = getId(item).toString();
    const isNotExisting = !existingItemIds.has(itemId);
    const matchesSearch = getName(item)
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return isNotExisting && matchesSearch;
  });

  const handleAddItem = (item: T) => {
    onAddItem(item);
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative my-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <div
                key={getId(item)}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{getName(item)}</div>
                  <div className="text-sm text-muted-foreground">
                    ID: {getId(item)}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddItem(item)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {items.length === 0 ? noItemsMessage : noResultsMessage}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;
