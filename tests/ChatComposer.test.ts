// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChatComposer from '@/components/chat/ChatComposer.vue'

const mountComposer = (sendMessage = vi.fn().mockResolvedValue(true)) =>
  mount(ChatComposer, { props: { sendMessage } })

describe('ChatComposer', () => {
  it('disables send button when empty', () => {
    const wrapper = mountComposer()
    expect(wrapper.find('button.send').attributes('disabled')).toBeDefined()
  })

  it('enables button with text', async () => {
    const wrapper = mountComposer()
    await wrapper.find('textarea').setValue('Chào mọi người')
    expect(wrapper.find('button.send').attributes('disabled')).toBeUndefined()
  })

  it('clears draft only after server-confirmed success', async () => {
    const sendMessage = vi.fn().mockResolvedValue(true)
    const wrapper = mountComposer(sendMessage)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Hello!')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(sendMessage).toHaveBeenCalledWith('Hello!')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
  })

  it('retains draft when network send fails', async () => {
    const sendMessage = vi.fn().mockResolvedValue(false)
    const wrapper = mountComposer(sendMessage)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Không mất tin')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect((textarea.element as HTMLTextAreaElement).value).toBe('Không mất tin')
  })

  it('prevents duplicate sends while pending', async () => {
    let finish!: (ok: boolean) => void
    const sendMessage = vi.fn().mockImplementation(() => new Promise<boolean>(resolve => { finish = resolve }))
    const wrapper = mountComposer(sendMessage)
    await wrapper.find('textarea').setValue('Một tin')
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.find('form').trigger('submit.prevent')
    expect(sendMessage).toHaveBeenCalledTimes(1)
    finish(true)
    await flushPromises()
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('keeps emoji picker and inserts emoji at caret', async () => {
    const wrapper = mountComposer()
    await wrapper.find('button#emojiButton').trigger('click')
    expect(wrapper.find('.picker#emojiPicker').classes()).toContain('show')
    await wrapper.findAll('.emoji-grid button')[0].trigger('click')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toContain('😀')
  })
})
