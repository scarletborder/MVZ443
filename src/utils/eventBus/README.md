
# EventBus
事件总线

1. 只有事件总线，体积小，无任何依赖
2. 完全的typescript支持
3. 技术栈无关，可以在react、vue、angular、nodejs等框架中使用
4. 使用灵活，设计简洁，功能强大

# 示例
## 基本使用
```ts
type Event = {
    onChange: (value: string) => void;
}
const eventBus = new EventBus();

useEffect(()=>{
    const off = eventBus.on('onChange', (value: string) => {
        console.log(value,'world');
    });
    return ()=>{
        off();//取消监听
    };
},[]);


const click = ()=>{
    eventBus.emit('onChange', 'hello');
}
```
## 带返回值的emit
```ts
type Event = {
    add10: (value: number) => number;
    sub20: (value: number) => number;
    print: (value: number) => void;
}
const eventBus = new EventBus();

useEffect(()=>eventBus.on('add10', (value: number) => {
    return value+10;
}),[]);
useEffect(()=>eventBus.on('sub20', (value: number) => {
    return value-20;
}),[]);
useEffect(()=>eventBus.on('print', (value: number) => {
    console.log(value);
}),[]);
const click = ()=>{
    const [num] = eventBus.emit('add10', 20);
    const [num2] = eventBus.emit('sub20', num);
    eventBus.emit('print', num2);// 示例输出10
}
```

## 类型拓展
```ts
type Event = {
    onChange: (value: string) => void;
}
const eventBus = new EventBus().extends<Event>();// 拓展事件的类型

useEffect(()=>eventBus.on('onChange', (value: string) => {
    console.log(value, 'world');
}),[]);

const click = ()=>{
    eventBus.emit('onChange', 'hello');
}
```

## 实例化新事件总线
```ts
const eventBus = new EventBus();
eventBus.newInstance();
```

## off取消
```ts
const eventBus = new EventBus();
const onChange = ()=>{
    console.log('hello');
}
useEffect(()=>{
    eventBus.on('onChange', onChange);
    return ()=>{
        eventBus.off('onChange', onChange);//也可以销毁监听
    }
},[])
```

## emit返回值等待promise
```ts
const eventBus = new EventBus<{
    GetUserInfo: () => Promise<{
        name: string;
        age: number;
    }>;
}>();
useEffect(()=>{
    return eventBus.on('GetUserInfo', async () => {
        return {
            name: '张三',
            age: 18
        };
    });
} ,[]);
useCallback(async ()=>{
    const [{name, age}] = await Promise.all(eventBus.emit('GetUserInfo'));
    console.log(name, age);
} ,[]);
```