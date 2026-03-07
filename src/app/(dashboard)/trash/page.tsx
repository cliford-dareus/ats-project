import React from 'react';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TrashPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Trash</h1>
          <p className="text-muted-foreground">Manage deleted items and restore if needed</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RotateCcw size={16} className="mr-2" />
            Restore Selected
          </Button>
          <Button variant="destructive">
            <Trash2 size={16} className="mr-2" />
            Empty Trash
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 size={20} />
            Deleted Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Trash2 size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No items in trash</h3>
            <p className="text-muted-foreground">
              Deleted items will appear here and can be restored within 30 days.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-orange-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-orange-800 dark:text-orange-200">Auto-deletion Policy</h4>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              Items in trash are automatically deleted after 30 days. Make sure to restore any important items before then.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrashPage;
