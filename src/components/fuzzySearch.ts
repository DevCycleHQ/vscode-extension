import Fuse from "fuse.js";
import { WebviewApi } from "vscode-webview";

export enum SearchType {
    variables = 'variables',
    features = 'features'
}
//View Provider
export const getCustomDropdown = (optionElements: string, selectedValue: string) => {
    return `
    <div class="custom-dropdown">
    <input type="text" class="dropdown-input" placeholder="Search..." value="${selectedValue}">
    <div class="dropdown-arrow">^</div>
    <div class="dropdown-options">
      ${optionElements}
    </div>
  </div>`
}

//View

/*
 default accept an array of objects with the following type:
 {
    label: string,
    value: string
 }
*/
export function handleFuzzySearchDropdown(
    vscode: WebviewApi<unknown>,
    searchType: SearchType,
    fuseOptions: Fuse.IFuseOptions<any> = {
        keys: ['label', 'value'],
        threshold: 0.5,
    }
) {
    window.addEventListener('message', (event) => {
        const message = event.data
        if (message.type === 'searchData') {
            const data = JSON.parse(message.value)
            localStorage.setItem(message.searchType, JSON.stringify(data))
        }
    })

    const localStorageData = localStorage.getItem(searchType)

    if (!localStorageData) {
        return
    }

    const input = document.querySelector('.dropdown-input') as HTMLInputElement
    const optionsList = document.querySelector('.dropdown-options') as HTMLDivElement

    const searchData: { label: string, value?: string }[] = JSON.parse(localStorageData)
    const fuse = new Fuse([...searchData], fuseOptions)

    const createAndAppendOption = (displayValue: string, dataAttributeValue?: string) => {
        const option = document.createElement('div')
        option.textContent = displayValue
        option.setAttribute('data-value', dataAttributeValue || displayValue)
        optionsList.appendChild(option);
    }

    // Event listeners to handle dropdown behavior
    document.addEventListener('click', () => {
        optionsList?.classList.remove('visible')
    })

    input?.addEventListener('click', (event) => {
        event.stopPropagation()
        optionsList?.classList.toggle('visible')
    })

    input?.addEventListener('input', () => {
        const inputValue = input?.value.toLowerCase().trim()
        optionsList.innerHTML = ''

        if (inputValue === '') {
            searchData.forEach((item) => {
                createAndAppendOption(item.label, item.value)
            })

            optionsList.classList.add('visible')
        } else {
            const results = fuse?.search(inputValue)
            results.forEach((result) => {
                createAndAppendOption(result.item.label, result.item.value)
            })

            if (results.length > 0) {
                optionsList.classList.add('visible')
            } else {
                optionsList.classList.remove('visible')
            }
        }
    })

    optionsList.addEventListener('click', (event) => {
        const selectedOption = event.target as HTMLElement
        if (selectedOption.tagName === 'DIV') {
            const selectedValue = selectedOption.getAttribute('data-value')
            if (selectedValue) {
                vscode.postMessage({
                    type: 'key',
                    value: selectedValue,
                })
                optionsList.classList.remove('visible')
            }
        }
    })

}