# Build My Own React

> 직접 만들어보며 이해하는 리액트

<br>

## What I Learn

<br>

### createElement

- createElement는 렌더 트리르 만드는 함수이다.
- 이것은 tag의 이름, 속성, 자식을 인자로 받는다.
- 자식을 받을 때는 자식이 object일 수도 있고, string일 수도 있는데, 경우에 따라 다르게 처리한다. (object일 때는 재귀적으로 createElement를 호출하고, string일 때는 text node를 만든다.)
- 이렇게 만든 노드들을 children 배열에 넣어서 리턴한다.

```js
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
```

<br>

### render 함수

- 다음은 render 함수를 만든다. 이 render 함수는 렌더 트리를 DOM에 반영하는 함수이다.
- 자식 노드가 있으면 재귀적으로 render 함수를 호출한다.
- 만약 받아온 element가 text node라면, textContent를 설정한다.
- 만약 받아온 element가 일반 노드라면, 속성을 설정한다. 속성을 설정할 때는 props의 key를 순회하면서, key가 children이 아니라면 해당 key에 해당하는 값을 설정한다.

```js
function render(element, container) {
  const dom =
    element.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type)

  const isProperty = key => key !== "children"
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name]
    })

  element.props.children.forEach(child => render(child, dom)) // recursive

  container.appendChild(dom)
}
```

<br>

### Concurrent mode

- 현재는 render를 할 때 재귀적으로 작동한다. 그래서 모든 element를 순회하면서 render를 할 때까지 작업을 멈출 수가 없다. 만약에 element tree가 매우 크다면, 메인 스레드를 너무 오랫동안 차지할 수도 있다. 만약 이런 상황에서 브라우저가 더 높은 우선순위를 가지고 다른 작업을 처리하려고 한다면, 렌더의 작업이 다 완료될 때까지 기다려야 할 것이다.
- 그래서 우리는 이 render의 작업을 매우 작은 작업들로 쪼갤 것이다. 그리고 만약 브라우저가 우선적으로 처리해야 하는 일이 있다면, 작은 단위의 작업들이 끝날 때마다 브라우저가 interrupt 할 수 있도록 할 것이다.
- 이것을 위해서 requestIdleCallback 를 사용할 것인데, 이 함수는 브라우저가 idle 상태가 되면 호출되는 함수이다. 리액트는 더 이상 이 함수를 사용하지 않고, 그들이 직접 만든 스케줄러 패키지를 사용하지만, 여기서는 개념상 유사한 requestIdleCallback을 사용할 것이다.
- 이 requestIdleCallback 함수는 deadline이라는 인자를 받는데, 이 deadline은 현재까지 얼마나 시간이 지났는지, 브라우저가 idle 상태가 되기까지 얼마나 시간이 남았는지를 알려준다.
- 이 loop를 시작하기 위해서 맨 첫번째로는 first unit of work를 만들어야 한다. 그리고 performUnitOfWork는 이 작업을 수행하는 함수이다. 이 함수는 현재 작업을 수행하고, 다음 작업을 리턴한다. 그리고 이 작업이 끝나면, 다음 작업을 수행한다. 이런 식으로 작업을 수행하다가, deadline이 끝나면, 다음 idle 상태가 되었을 때까지 기다린다. 그리고 다시 loop를 시작한다.

```js
let nextUnitOfWork = null
​
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    shouldYield = deadline.timeRemaining() < 1
  }
  requestIdleCallback(workLoop)
}
​
requestIdleCallback(workLoop)
​
function performUnitOfWork(nextUnitOfWork) {
  // TODO
}
```
