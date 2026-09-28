"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export function SearchTransitionOverlay({ show }: { show: boolean }) {
  const { t } = useLocale();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background"
        >
          <motion.span
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Sparkles className="size-5" />
          </motion.span>
          <p className="text-sm text-muted-foreground">{t.common.loading}</p>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-full rounded-full bg-primary"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
