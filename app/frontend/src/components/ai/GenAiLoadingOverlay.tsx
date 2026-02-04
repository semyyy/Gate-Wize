/**
 * Copyright (c) 2026 EAExpertise
 *
 * This software is licensed under the MIT License with Commons Clause.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to use,
 * copy, modify, merge, publish, distribute, and sublicense the Software,
 * subject to the conditions of the MIT License and the Commons Clause.
 *
 * Commercial use of this Software is strictly prohibited unless explicit prior
 * written permission is obtained from EAExpertise.
 *
 * The Software may be used for internal business purposes, research,
 * evaluation, or other non-commercial purposes.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

"use client";

import React from 'react';
import { createPortal } from 'react-dom';

export default function GenAiLoadingOverlay({
  title = 'Analyzing with AI',
  subtitle = 'Generating ratings and feedback…',
}: {
  title?: string;
  subtitle?: string;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const overlay = (
    <div className="fixed inset-0 z-50 bg-white/70 backdrop-blur-md pointer-events-none">
      <div className="sticky top-6 z-30 flex w-full justify-center p-4">
        <div className="relative w-[min(92vw,28rem)] rounded-xl border border-gray-200 bg-white shadow-lg p-5 pointer-events-auto">
          <div className="relative">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" aria-label="Loading" />
              <div className="h-1.5 flex-1 rounded bg-gray-100 overflow-hidden">
                <div className="h-full w-1/3 rounded bg-gray-300 animate-[loading_1.6s_ease_infinite]" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">This may take a few seconds.</p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(30%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </div>
  );
  if (!mounted) return null;
  return createPortal(overlay, document.body);
}
