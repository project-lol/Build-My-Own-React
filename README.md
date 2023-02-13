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

<br>

### Fiber

- units of work를 만들기 위해서, fiber라는 자료구조를 만들어볼 것이다. 우리는 하나의 element마다 하나의 fiber를 가지게 될 것이고, 이 fiber는 하나의 unit of work가 될 것이다.

```js
Didact.render(
  <div>
    <h1>
      <p />
      <a />
    </h1>
    <h2 />
  </div>,
  container
)
```

- 만약 이런 element tree가 있다고 하자. 그러면 우리의 render함수는 가장 먼저 root fiber를 만들 것이고, 그것을 nextUnitOfWork로 설정할 것이다. 그리고 나머지 작업들은 performUnitOfWork에서 처리할 것이다.
- 각각의 fiber마다 하게 될 3가지 일이 있다.
  - element를 DOM에 추가한다.
  - element의 자식을 위한 fiber를 만든다.
  - 다음 unit of work을 선택한다.
- 이런 자료구조의 주된 목적은 next unit of work를 쉽게 찾기 위한 것이다. 이것을 위해서 각각의 fiber가 그들의 첫번째 자식과 연결되어 있고, 그것들이 형제들 그리고 부모와 연결되어 있는 것이다.
- perform of work를 끝냈을 때, child가 남아있다면 그 child가 바로 next unit of work가 될 것이다. 예를 들어서, 위의 예시를 볼 때, h1에 대한 perform of work가 끝나면, next unit of work는 h1이 될 것이다.
- 만약 fiber가 자식을 가지고 있지 않다면, 그 다음 실행 요소는 sibling이 될 것이다. 예를 들어 p는 더 이상 child를 가지고 있지 않기 때문에, sibling에 해당하는 a가 next unit of work가 될 것이다.
- 그리고 fiber가 자식도 안가지고 있고, 형제도 안가지고 있다면 삼촌에게 갈 것이다. a와 h2의 관계와 같다.
- 또한 만약 부모가 sibling을 가지고 있지 않다면, 그 부모의 부모에게 갈 것이다. 여기서 또 반복해서 형제를 탐색하고, 형제가 없다면 삼촌에게 갈 것이다.
- 그렇게 root에 닿는다면, 더 이상 next unit of work가 없기 때문에, render함수가 할 일은 끝난 것이다.

<br>

### Render and Commit Phases

- 이 지점까지 왔을 때, 우리가 생각해볼 수 있는 문제점이 있다. 앞서 우리가 했던 작업은 각각의 element에 대해서 순회를 하면서 각각의 element를 dom에 추가해주고 있었다. 그리고 각각의 element의 작업을 수행할 때마다 브라우저가 interrupt 할 수 있도록 했다. 그러나 이렇게 할 경우, 우리는 유저에게 완벽하지 않은 ui를 보여주게 될 가능성이 존재한다. 우리는 이런 것을 원하는 게 아니다.
- 때문에 현재는 당장에 Dom을 mutate하는 작업을 분리시킬 필요가 있다.
- 대신에 우리는 fiberTree의 root를 계속해서 추적할 것이다. 우리는 이것을 work of progress root라고 부르거나, wipRoot라고 부른다.
- 이 모든 작업이 끝나고 나면, 우리는 이 전체 fiber tree를 commit해야 한다. 이것은 우리가 실제로 dom에 변화를 주는 작업이다.
- 이것을 commitRoot에서 실행한다.

<br>

### Reconciliation

- 지금까지 우리는 Dom에 새로운 노드를 추가하는 작업을 해왔다. 그런데, update나 delete 같은건 어떻게 할 것인가?
- 이것을 위해서 우리는 render 함수에게서 받은 요소를 마지막에 fiber tree가 Dom에 commit 했던 요소와 비교할 것이다.
- 때문에 우리는 이전에 commit한 fiber tree를 저장해둘 필요가 있다. 그리고 이것을 currentRoot라고 부를 것이다.
- 또한 우리는 alternate 속성을 모든 fiber에 추가할 것이다. 이것은 이전 fiber tree의 fiber를 가리키는 포인터이다.
