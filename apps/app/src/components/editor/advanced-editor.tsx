"use client";

import { updatePolicyAction } from "@/actions/policies/update-policy-action";
import { Separator } from "@bubba/ui/separator";
import { useAction } from "next-safe-action/hooks";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  ImageResizer,
  type JSONContent,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from "novel";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "./extensions";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { uploadFn } from "./image-upload";
import { ColorSelector } from "./selectors/color-selector";
import { LinkSelector } from "./selectors/link-selector";
import { MathSelector } from "./selectors/math-selector";
import { NodeSelector } from "./selectors/node-selector";
import { TextButtons } from "./selectors/text-buttons";
import { slashCommand, suggestionItems } from "./slash-command";

const extensions = [...defaultExtensions, slashCommand];

const PolicyEditor = ({
  policyId,
  content,
}: {
  policyId: string;
  content: JSONContent;
}) => {
  const [initialContent, setInitialContent] = useState<JSONContent>({
    type: "doc",
    content: content as JSONContent[],
  });
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState();

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, "text/html");
    for (const el of doc.querySelectorAll("pre code")) {
      // @ts-ignore
      // https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
      hljs.highlightElement(el);
    }
    return new XMLSerializer().serializeToString(doc);
  };

  const updatePolicy = useAction(updatePolicyAction, {
    onSuccess: () => {
      setSaveStatus("Saved");
    },
    onError: () => {
      toast.error("Failed to update policy");
    },
  });

  const debouncedUpdates = useDebouncedCallback(
    async (editor: EditorInstance) => {
      const json = editor.getJSON();
      setCharsCount(editor.storage.characterCount.words());

      updatePolicy.execute({
        id: policyId,
        content: json,
      });
    },
    1000
  );

  if (!initialContent) return null;

  // set initial charcount
  useEffect(() => {
    setCharsCount(initialContent.length);
  }, [initialContent]);

  return (
    <div className="relative h-full w-full">
      <div className="flex absolute right-5 top-5 z-10 mb-5 gap-2">
        <div className="bg-accent/50 px-2 py-1 text-sm text-muted-foreground rounded-md">
          {saveStatus}
        </div>
        {charsCount && (
          <div className="bg-accent/50 px-2 py-1 text-sm text-muted-foreground rounded-md">
            {charsCount} Words
          </div>
        )}
      </div>
      <EditorRoot>
        <EditorContent
          immediatelyRender={false}
          initialContent={initialContent}
          // @ts-ignore
          extensions={extensions}
          className="prose prose-sm max-w-none"
          editorProps={{
            attributes: {
              class:
                "h-full w-full focus:outline-none text-foreground px-16 py-16 max-w-[900px] mx-auto",
            },
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) =>
              handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) =>
              handleImageDrop(view, event, moved, uploadFn),
          }}
          onUpdate={({ editor }) => {
            debouncedUpdates(editor);
            setSaveStatus("Unsaved");
          }}
          slotAfter={<ImageResizer />}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto border border-muted bg-background px-1 py-2 transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">
              No results
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex w-full items-center space-x-2 px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center  border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />

            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" />
            <MathSelector />
            <Separator orientation="vertical" />
            <TextButtons />
            <Separator orientation="vertical" />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
          </GenerativeMenuSwitch>
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default PolicyEditor;
