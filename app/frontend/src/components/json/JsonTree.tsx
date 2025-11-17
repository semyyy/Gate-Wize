"use client";

import { JsonView, darkStyles, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

export function JsonTree({ value }: { value: unknown }) {
  return (
    <div className="border rounded-md p-3 overflow-auto h-[600px]">
      <JsonView {...({ data: value as any, shouldInitiallyExpand: (level: number) => level < 2, style: defaultStyles } as any)} />
    </div>
  );
}
