// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MessageBubbleList from '@/components/chat/MessageBubbleList.vue'

const messages = [
  { id: '1', room_id: 'r', user_id: 'u2', content: 'Mọi người tối nay ổn không?', created_at: '2026-10-29T20:14:00Z' },
  { id: '2', room_id: 'r', user_id: 'u2', content: 'Mai mình chốt giờ gặp nhé.', created_at: '2026-10-29T20:16:00Z' },
  { id: '3', room_id: 'r', user_id: 'u1', content: 'Ổn nhé, mai gặp!', created_at: '2026-10-29T20:17:00Z' },
]
const members = [{ room_id: 'r', user_id: 'u2', role: 'member', joined_at: '', profile: { id: 'u2', display_name: 'Linh Mai', avatar_url: null, created_at: '', updated_at: '' } }]

describe('MessageBubbleList', () => {
  it('maps sender names from roomMembers, groups bubbles and separates dates', () => {
    const wrapper = mount(MessageBubbleList, { props: { messages, members, currentUserId: 'u1' } as any })
    const rows = wrapper.findAll('article.message')
    expect(rows).toHaveLength(3)
    expect(rows[0].find('.meta').text()).toContain('Linh Mai')
    expect(rows[0].find('.avatar').text()).toContain('LM')
    expect(rows[1].classes()).toContain('grouped')
    expect(rows[2].classes()).toContain('me')
    expect(rows[2].text()).toContain('Đã gửi')
    expect(wrapper.find('.day').exists()).toBe(true)
  })

  it('does not autoscroll when incoming realtime arrives while reading old history', async () => {
    const wrapper = mount(MessageBubbleList, { props: { messages, members, currentUserId: 'u1' } as any })
    const el = wrapper.find('.messages').element as HTMLDivElement
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: 300 })
    el.scrollTop = 20
    el.scrollTo = vi.fn()
    await wrapper.setProps({ messages: [...messages, { id: '4', room_id: 'r', user_id: 'u2', content: 'Tin mới', created_at: '2026-10-29T20:18:00Z' }] })
    await flushPromises()
    expect(el.scrollTo).not.toHaveBeenCalled()
    expect(wrapper.find('.new-messages-btn').text()).toContain('1 tin mới')
    await wrapper.find('.new-messages-btn').trigger('click')
    await flushPromises()
    expect(el.scrollTo).toHaveBeenCalledTimes(1)
  })

  it('preserves reader scrollTop when older history is prepended', async () => {
    let contentHeight = 1000
    let wrapper: ReturnType<typeof mount>
    const loadOlder = vi.fn(async () => {
      contentHeight = 1300
      await wrapper.setProps({
        messages: [{ id: '0', room_id: 'r', user_id: 'u2', content: 'Tin cũ', created_at: '2026-10-29T20:13:00Z' }, ...messages],
      })
    })
    wrapper = mount(MessageBubbleList, { props: { messages, members, currentUserId: 'u1', hasMore: true, loadOlder } as any })
    const el = wrapper.find('.messages').element as HTMLDivElement
    Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => contentHeight })
    el.scrollTop = 60
    el.scrollTo = vi.fn()
    await wrapper.find('.load-more-btn').trigger('click')
    await flushPromises()
    expect(loadOlder).toHaveBeenCalledTimes(1)
    expect(el.scrollTop).toBe(360)
    expect(el.scrollTo).not.toHaveBeenCalled()
  })
})
