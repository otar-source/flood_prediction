


let user = [
    {name:"Mark", age: 22},
    {name:"John", age: 24},
    {name:"Act", age: 26},
    {name:"Luke", age: 28},
    {name:"Titus", age: 30}
]


const m = user.filter(m => m.age <= 26).map( n => ({
    ...n,
    age: n.age + 50}))

console.log(m)
console.log("hello")