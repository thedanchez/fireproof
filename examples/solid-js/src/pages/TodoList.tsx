import { For } from 'solid-js';
import { createFireproof } from '@fireproof/solid-js';

// You can have a global database that any Solid component can import
export const todoList = createFireproof('todo-list');

type Todo = { text: string; date: number; completed: boolean };

export default function TodoList() {
  const { createDocument, createLiveQuery } = todoList
  const todos = createLiveQuery<Todo>('date', { limit: 10, descending: true })
  const [todo, setTodo, saveTodo] = createDocument<Todo>({
    text: '',
    date: Date.now(),
    completed: false,
  });

  return (
    <>
      <div>
        <input 
          type="text" 
          value={todo().text} 
          placeholder="new todo here"
          onChange={e => {
            setTodo({ text: e.target.value.trim() })
          }} 
        />
        <button
          onClick={async () => {
            await saveTodo()
            setTodo()
          }}
        >
          Add Todo
        </button>
      </div>
      <For each={(todos().docs)}>
        {(todo) => {
          return (
            <div>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={async () => await saveTodo({ ...todo, completed: !todo.completed })}
              />
              <span
                style={{
                  'text-decoration': todo.completed ? 'line-through' : 'none',
                }}
              >
                {todo.text}
              </span>
            </div>
          );
        }}
      </For>
    </>
  );
};
