import { provideVSCodeDesignSystem, vsCodeDropdown, vsCodeOption, Dropdown } from "@vscode/webview-ui-toolkit";

provideVSCodeDesignSystem().register(vsCodeDropdown(), vsCodeOption());

const vscode = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // Home section nav shadow on scroll
  const homeNavIntercept = document.getElementById("home-nav-intercept") as HTMLElement;
  const header = document.getElementById("home-nav") as HTMLElement;
  homeNavIntercept.setAttribute("data-observer-intercept", "");
  header.before(homeNavIntercept);

  const observer = new IntersectionObserver(([entry]) => {
    header.classList.toggle("active", !entry.isIntersecting);
  });

  observer.observe(homeNavIntercept);

  // Logout button
  const logoutButton = document.getElementById("logout-button") as HTMLButtonElement;
  logoutButton.addEventListener('click', () => {
    vscode.postMessage({
      type: 'logout'
    });
  });

  // Home section dropdowns
  const homeSectionDropdowns = document.getElementsByClassName("home-dropdown") as HTMLCollectionOf<Dropdown>;
  for (let i = 0; i < homeSectionDropdowns.length; i++) {
    const dropdown = homeSectionDropdowns[i];
    dropdown.addEventListener('change', handleDropdownValueChange);
  }

  const editConfigButtons = document.getElementsByClassName("edit-config-button") as HTMLCollectionOf<HTMLAnchorElement>;
  for (let i = 0; i < editConfigButtons.length; i++) {
    // Edit config button
    const editConfigButton = document.getElementById(`editConfigButton${i}`) as HTMLAnchorElement;
    editConfigButton.addEventListener('click', handleEditConfigClick);
  }
}

function handleDropdownValueChange(event: Event) {
  if (!event.target) {
    return;
  }

  const dropdownElement = event.target as HTMLSelectElement;

  if (dropdownElement.id.includes('project')) {
    const placeholderOption = document.querySelector('.placeholder') as HTMLElement;
    if (placeholderOption) {
      placeholderOption.hidden = true;
    }
  }

  vscode.postMessage({
    type: dropdownElement.dataset.type,
    value: dropdownElement.value,
    folderIndex: dropdownElement.dataset.folder
  });
}

const handleEditConfigClick = (event: Event) => {
  const buttonElement = event.target as HTMLButtonElement;
  vscode.postMessage({
    type: 'config',
    folderIndex: buttonElement.dataset.folder
  });
}
