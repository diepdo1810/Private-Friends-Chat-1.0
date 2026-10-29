// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageBubbleList from '@/components/chat/MessageBubbleList.vue'

describe('MessageBubbleList', () => {
  it('renders messages with correct bubble classes and dates', () => {
    const messages = [
      {
        id: '1',
        user_id: 'u2',
        content: 'Mọi người tối nay ổn không?',
        created_at: '2026-10-29T20:14:00Z',
        sender: { id: 'u2', display_name: 'Linh Mai' },
      },
      {
        id: '2',
        user_id: 'u2',
        content: 'Mai mình chốt giờ gặp nhé.',
        created_at: '2026-10-29T20:16:00Z',
        sender: { id: 'u2', display_name: 'Linh Mai' },
      },
      {
        id: '3',
        user_id: 'u1',
        content: 'Ổn nhé, mai gặp!',
        created_at: '2026-10-29T20:17:00Z',
        sender: { id: 'u1', display_name: 'Bạn' },
      },
    ]

    const wrapper = mount(MessageBubbleList, {
      props: {
        messages: messages as any,
        currentUserId: 'u1',
      },
    })

    const items = wrapper.findAll('article.message')
    expect(items.length).toBe(3)

    // First message is other user
    expect(items[0].classes()).not.toContain('me')
    expect(items[0].classes()).not.toContain('grouped')
    expect(items[0].find('.meta').text()).toContain('Linh Mai')

    // Second message is same user within 2 mins -> grouped!
    expect(items[1].classes()).not.toContain('me')
    expect(items[1].classes()).toContain('grouped')

    // Third message is current user -> me!
    expect(items[2].classes()).toContain('me')
    expect(items[2].text()).toContain('Đã gửi')

    // Day divider should exist
    const day = wrapper.find('.day')
    expect(day.exists()).toBe(true)
  })
})
