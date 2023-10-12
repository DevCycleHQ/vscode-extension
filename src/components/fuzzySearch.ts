import Fuse from "fuse.js";
import { WebviewApi } from "vscode-webview";

export enum SearchType {
    variables = 'variables',
    features = 'features',
    projects = 'projects',
}

type LocalStorageKey = `${SearchType}${string}` | SearchType

//View Provider
export const getCustomDropdown = (optionElements: string, selectedValue: string, folderIndex?: number, dataType?: string) => {
    const folderAttribute = folderIndex !== undefined ? `data-folder="${folderIndex}"` : ''
    const dataTypeAttribute = dataType ? `data-type="${dataType}"` : ''
    const inputId = folderIndex !== undefined ? `id="dropdown-input-${folderIndex}"` : ''
    const optionsListId = folderIndex !== undefined ? `id="dropdown-optionsList-${folderIndex}"` : ''
    return `
    <div class="custom-dropdown">
    <input ${inputId} type="text" class="dropdown-input" placeholder="Search..." value="${selectedValue}">
    <div class="dropdown-arrow">^</div>
    <div ${optionsListId} class="dropdown-options" ${folderAttribute} ${dataTypeAttribute}>
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
    localStorageKey: LocalStorageKey,
    fuseOptions: Fuse.IFuseOptions<any> = {
        keys: ['label', 'value'],
        threshold: 0.5,
    },
    inputSelector: string = '.dropdown-input',
    optionsListSelector: string = '.dropdown-options'
) {
    window.addEventListener('message', (event) => {
        const message = event.data
        if (message.type === 'searchData') {
            const data = JSON.parse(message.value)
            localStorage.setItem(message.searchType, JSON.stringify(data))
        }
    })

    const input = document.querySelector(inputSelector) as HTMLInputElement
    const optionsList = document.querySelector(optionsListSelector) as HTMLDivElement
    const folderIndex = optionsList?.getAttribute('data-folder')
    const selectedValueKey = `selectedValue${folderIndex || ''}`

    const createAndAppendOption = (displayValue: string, dataAttributeValue?: string) => {
        const option = document.createElement('div')
        option.textContent = displayValue
        option.setAttribute('data-value', dataAttributeValue || displayValue)
        optionsList.appendChild(option);
    }

    // Event listeners to handle dropdown behavior
    document.addEventListener('click', () => {
        if (!optionsList?.classList.contains('visible')) {
            return
        }
        const selectedValue = localStorage.getItem(selectedValueKey)
        if (selectedValue) {
            input.value = selectedValue
        }
        optionsList?.classList.remove('visible')
    })

    optionsList?.addEventListener('click', (event) => {
        const selectedOption = event.target as HTMLElement
        if (selectedOption.tagName === 'DIV') {
            const selectedValue = selectedOption.getAttribute('data-value')
            const selectedType = optionsList.getAttribute('data-type')
            if (selectedValue) {
                input.value = selectedOption.innerText
                vscode.postMessage({
                    type: selectedType || 'key',
                    value: selectedValue,
                    ...(optionsList.dataset.folder && { folderIndex: optionsList.dataset.folder })
                })
                optionsList.classList.remove('visible')
            }
        }
    })

    input?.addEventListener('click', (event) => {
        const { value } = event.target as HTMLInputElement
        localStorage.setItem(selectedValueKey, value)
        event.stopPropagation()
        optionsList?.classList.toggle('visible')
    })


    let localStorageData: string | null = localStorage.getItem(localStorageKey)
    const refreshLocalStorageData = () => {
        localStorageData = localStorage.getItem(localStorageKey)
    }
    input?.addEventListener('input', () => {
        if (!localStorageData) {
            vscode.postMessage({
                type: 'setFuseData',
                ...(folderIndex && { folderIndex: folderIndex })
            })
            refreshLocalStorageData()
            return
        }

        const searchData: { label: string, value?: string }[] = JSON.parse(localStorageData)
        const fuse = new Fuse([...searchData], fuseOptions)
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

}