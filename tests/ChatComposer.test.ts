// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatComposer from '@/components/chat/ChatComposer.vue'

describe('ChatComposer', () => {
  it('disables send button when draft is empty', () => {
    const wrapper = mount(ChatComposer)
    const sendButton = wrapper.find('button.send')
    expect(sendButton.attributes('disabled')).toBeDefined()
  })

  it('enables send button when draft has non-whitespace text', async () => {
    const wrapper = mount(ChatComposer)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Chào mọi người')
    const sendButton = wrapper.find('button.send')
    expect(sendButton.attributes('disabled')).toBeUndefined()
  })

  it('emits send with trimmed text and clears textarea on submit', async () => {
    const wrapper = mount(ChatComposer)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Hello!')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.emitted('send')?.[0]).toEqual(['Hello!'])
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
  })

  it('toggles emoji picker when emoji button is clicked', async () => {
    const wrapper = mount(ChatComposer)
    const emojiBtn = wrapper.find('button#emojiButton')
    expect(wrapper.find('.picker#emojiPicker').classes()).not.toContain('show')
    await emojiBtn.trigger('click')
    expect(wrapper.find('.picker#emojiPicker').classes()).toContain('show')
  })

  it('inserts selected emoji into draft and closes picker', async () => {
    const wrapper = mount(ChatComposer)
    await wrapper.find('button#emojiButton').trigger('click')
    const emojiBtns = wrapper.findAll('.emoji-grid button')
    expect(emojiBtns.length).toBeGreaterThan(0)
    await emojiBtns[0].trigger('click')
    const textarea = wrapper.find('textarea').element as HTMLTextAreaElement
    expect(textarea.value).toContain('😀')
    expect(wrapper.find('.picker#emojiPicker').classes()).not.toContain('show')
  })
})
