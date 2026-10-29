// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OfflineBanner from '@/components/chat/OfflineBanner.vue'

describe('OfflineBanner', () => {
  it('renders correctly with message and retry button when visible', async () => {
    const wrapper = mount(OfflineBanner, { props: { visible: true } })
    expect(wrapper.text()).toContain('Mất kết nối')
    expect(wrapper.text()).toContain('Tin nhắn chưa gửi. Bản soạn vẫn được giữ.')
    const retryBtn = wrapper.find('button#retry')
    expect(retryBtn.exists()).toBe(true)
    await retryBtn.trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
  })

  it('is hidden when visible is false', () => {
    const wrapper = mount(OfflineBanner, { props: { visible: false } })
    expect(wrapper.find('.connection').classes()).not.toContain('show')
  })
})
