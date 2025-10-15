import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const AiCursorDecoration = Extension.create({
    name: "AiCursorDecorationPlugin",

    addProseMirrorPlugins() {

        return [ new Plugin<{
            decorations: DecorationSet
        }>({
            key: new PluginKey(`AiCursorDecorationPlugin`),

            state: {
                init() {
                    return {
                        decorations: DecorationSet.empty,
                    }
                },
                apply(tr, value) {
                    if (tr.getMeta("AiCursorDecoration")) {
                        const {pos, range} = tr.getMeta("AiCursorDecoration")

                        if( !pos ) {
                            return { decorations: DecorationSet.empty }
                        }

                        return { decorations: DecorationSet.create(tr.doc, [
                                Decoration.widget(range.to-1, () => {
                                    const element = document.createElement('span')
                                    element.classList.add('tiptap-ai-cursor')

                                    return element
                                })
                            ]) }
                    } else {
                        return { decorations: value.decorations.map(tr.mapping, tr.doc) }
                    }
                }
            },
            props: {
                decorations(state) {
                    return this.getState(state)?.decorations
                }
            }
        })]

    }


})
