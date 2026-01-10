"use client";

import { useEffect, useRef } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { editor } from "monaco-editor";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = "json",
  readOnly = false,
  height = "100%",
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom Movement theme
    monaco.editor.defineTheme("movement-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "eab308" }, // Yellow for keys
        { token: "string.value.json", foreground: "22c55e" }, // Green for string values
        { token: "number", foreground: "3b82f6" }, // Blue for numbers
        { token: "keyword", foreground: "eab308" },
        { token: "comment", foreground: "6b7280" },
      ],
      colors: {
        "editor.background": "#0a0a0b",
        "editor.foreground": "#e4e4e7",
        "editor.lineHighlightBackground": "#18181b",
        "editor.selectionBackground": "#eab30830",
        "editorCursor.foreground": "#eab308",
        "editorWhitespace.foreground": "#27272a",
        "editorIndentGuide.background": "#27272a",
        "editorIndentGuide.activeBackground": "#3f3f46",
        "editor.selectionHighlightBackground": "#eab30820",
        "editorLineNumber.foreground": "#52525b",
        "editorLineNumber.activeForeground": "#a1a1aa",
        "editorBracketMatch.background": "#eab30830",
        "editorBracketMatch.border": "#eab308",
      },
    });

    monaco.editor.setTheme("movement-dark");

    // Configure JSON language settings
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [
        {
          uri: "movetracer://payload",
          fileMatch: ["*"],
          schema: {
            type: "object",
            properties: {
              function: {
                type: "string",
                description: "The function to call (e.g., 0x1::coin::transfer)",
              },
              type_arguments: {
                type: "array",
                items: { type: "string" },
                description: "Type arguments for generic functions",
              },
              arguments: {
                type: "array",
                description: "Function arguments",
              },
            },
            required: ["function"],
          },
        },
      ],
    });
  };

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={(val) => onChange(val || "")}
      onMount={handleEditorMount}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "var(--font-geist-mono), monospace",
        fontLigatures: true,
        lineNumbers: "on",
        glyphMargin: false,
        folding: true,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 3,
        renderLineHighlight: "line",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        padding: { top: 16, bottom: 16 },
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
        contextmenu: true,
        formatOnPaste: true,
        formatOnType: true,
      }}
      loading={
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    />
  );
}
