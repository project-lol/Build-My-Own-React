function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  }
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

// 이 함수에서 자식을 재귀적으로 순회하는 부분은 fiber에 의해서 대체되었다. dom을 생성하는 부분은 createDom 함수로 분리할 것이다.
// function render(element, container) {
//   const dom =
//     element.type == "TEXT_ELEMENT"
//       ? document.createTextNode("")
//       : document.createElement(element.type)

//   const isProperty = key => key !== "children"
//   Object.keys(element.props)
//     .filter(isProperty)
//     .forEach(name => {
//       dom[name] = element.props[name]
//     })

//   element.props.children.forEach(child => render(child, dom)) // recursive

//   container.appendChild(dom)
// }

function commitRoot() {
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  wipRoot = null
}

function commitWork(fiber) {
  if (!fiber) {
    return
  }
  const domParent = fiber.parent.dom
  domParent.appendChild(fiber.dom)
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  }
  nextUnitOfWork = wipRoot
}

let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null

function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }
}

function performUnitOfWork(fiber) {
  //fiber.dom을 확인하고, fiber를 이용해 새로운 node를 만든다음 dom에 추가한다.
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  // fiber의 부모가 있다면, fiber의 dom을 부모의 dom에 추가한다.
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom)
  }

  const elements = fiber.props.children
  let index = 0
  let prevSibling = null

  while (index < elements.length) {
    const element = elements[index] // 첫번째 자식부터 순회한다.

    // 현재의 element에 대한 fiber를 만든다.
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
    }

    // 현재 첫번째 자식에 있다면, fiber의 child로 설정한다.
    if (index === 0) {
      fiber.child = newFiber
    } else {
      // 첫번째 자식이 아니라면, 이전의 자식의 sibling로 설정한다.
      prevSibling.sibling = newFiber
    }

    // 현재의 자식을 이전의 자식으로 설정한다.
    prevSibling = newFiber
    index++
  }

  // fiber의 자식들에 대한 순회가 끝난 후에, fiber의 child가 있다는 것이 확인이 된다면 , child를 반환한다.
  if (fiber.child) {
    return fiber.child
  }

  // fiber의 자식들에 대한 순회가 끝난 후에, fiber의 child가 없다면 nextFiber에 fiber를 할당한다.
  let nextFiber = fiber

  // nextFiber가 null이 아닐 때까지, nextFiber의 sibling이 있다면, sibling을 반환한다.
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

const Didact = {
  createElement,
  render,
}
