class SellingPlanPicker extends window.HTMLElement {
  constructor() {
    super()
    this.addEventListener('change', this.onChange.bind(this))
  }

  onChange(event) {
    const input = event.target
    if (input.name === 'purchase_option') {
      this.onPurchaseOptionChange(input.value)
    } else if (input.name.startsWith('selling_plan_group_')) {
      this.updateHiddenInput(input.value)
    }
  }

  onPurchaseOptionChange(groupId) {
    // Hide all plan group fieldsets
    this.querySelectorAll('[data-plan-group]').forEach((fieldset) => {
      fieldset.hidden = true
    })

    if (!groupId) {
      // One-time purchase selected
      this.updateHiddenInput('')
      return
    }

    // Show the selected group's fieldset if it exists (multi-plan groups)
    const groupFieldset = this.querySelector(
      `[data-plan-group="${groupId}"]`
    )
    if (groupFieldset) {
      groupFieldset.hidden = false
      const checkedPlan = groupFieldset.querySelector('input:checked')
      this.updateHiddenInput(checkedPlan ? checkedPlan.value : '')
    } else {
      // Single plan group — use the default plan ID from the data attribute
      const groupRadio = this.querySelector(
        `input[name="purchase_option"][value="${groupId}"]`
      )
      this.updateHiddenInput(
        groupRadio ? groupRadio.dataset.defaultPlan : ''
      )
    }
  }

  updateHiddenInput(value) {
    const hidden = this.querySelector('input[name="selling_plan"]')
    if (hidden) hidden.value = value
  }
}

window.customElements.define('selling-plan-picker', SellingPlanPicker)
