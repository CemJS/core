import { display } from './jsx'
import * as Fn from './fn'

const pageFront = { lists: [] }
const Services = {}
const Variable = {}
const Cross = {}

const sendOn = function (name, ...data) {

    if (this._ListsOn[name]) {
        this._ListsOn[name].bind(this)(...data)
    }
}

const checkDifferent = function (data, data2) {
    if (data?.toString() == data2?.toString()) {
        return false
    }
    return true
}

const VDomStartFn = function (_VDomNew, Data) {
    if (typeof _VDomNew != "object") {
        return _VDomNew
    }
    let tmp = { tag: _VDomNew.tag, data: _VDomNew.data, children: _VDomNew.children }
    if (typeof tmp.tag == "function") {
        let tmpp = VDomStartFn(tmp.tag.bind(Data)(tmp.data), Data)
        return tmpp
    }
    if (tmp.children) {
        tmp.children.forEach((item, index) => {
            tmp.children[index] = VDomStartFn(tmp.children[index], Data)
        })
    }
    return tmp
}

class Events {
    constructor(url) {
        this.url = url
        this.event = new EventSource(url)
    }

    addEventListener(type, fn) {
        this.event.addEventListener(type, fn)
    }

    close() {
        this.event.close()
    }

    change(url) {
        this.event.close()
        this.url = url
        this.event = new EventSource(url)
    }

}

class Frontends {

    static lists = {}

    constructor(front) {
        this.name = front.name
        this.loader = front.loader
        this.display = front.display
        this.Static = { name: this.name }
        this.Events = {}
        this.func = front.func
        this._fn = front.fn || front.func
        this.Fn = Fn
        this.Services = Services
        this.Variable = Variable
        this.Ref = {}
        this._ListsEventListener = []
        this._ListsEventSource = []
        this._ListsInit = []
        this._ListsOn = {}
        Frontends.lists[this.name] = this
    }

    cross(data) {
        for (let item of Cross[this.name]) {
            if (Frontends.lists[item.name]?.$el)
                item.fn.bind(Frontends.lists[item.name])(data)
        }
    }

    fn(key, ...data) {
        if (typeof this.func[key] == "function") {
            this.func[key].bind(this)(...data)
        }
    }

    on(name, callback) {
        if (typeof callback == "function") {
            this._ListsOn[name] = callback
        } else if (name == "cross") {
            for (let item of callback) {
                item.name = this.name
                if (!Cross[item.front]) {
                    Cross[item.front] = [item]
                } else {
                    Cross[item.front].push(item)
                }
            }
        }
    }

    services(name, ...data) {
        let [serv, key] = name.split(".")
        if (this.Services[serv] && typeof this.Services[serv][key] == "function") {
            return this.Services[serv][key].bind(this)(...data)
        }
        return null
    }

    event(url) {
        let event = new Events(url)
        this._ListsEventSource.push(event)
        return event
    }

    eventSource(url) {
        if (this.Variable._Api) {
            url = this.Variable._Api + url
        }
        let event = new Events(url)
        this._ListsEventSource.push(event)
        return event
    }

    eventSourceChange(url) {
        this._ListsEventSource[0].close()
        this._ListsEventSource = []
        if (this.Variable._Api) {
            url = this.Variable._Api + url
        }
        let event = new Events(url)
        this._ListsEventSource.push(event)
        return event
    }

    clearData() {
        this?.$el?.remove()
        delete this.$el
        delete this._VDomNew
        delete this._VDomActual
        this.Static = { name: this.name }
        this.Ref = {}
        this._ListsEventListener = this._ListsEventListener.filter((item) => {
            item.$el.removeEventListener(item.name, item.fn)
            return false
        })
        this._ListsEventSource = this._ListsEventSource.filter((item) => {
            item.close()
            return false
        })
        this.Events = {}
        this.Variable.$el.body.style.overflow = '';
    }

    initAuto(keys, fn) {
        const init = this.init.bind(this)
        if (Array.isArray(keys)) {
            for (let item of keys) {
                if (this.Static[item]) {
                    this.Static[`_${item}`] = this.Static[item]
                }
                this.Static.__defineGetter__(item, function () {
                    return this[`_${item}`]
                });
                this.Static.__defineSetter__(item, function (value) {
                    if (fn && fn(value, item)) {
                        this[`_${item}`] = value;
                        init()
                    } else if (!fn && checkDifferent(this[`_${item}`], value)) {
                        this[`_${item}`] = value;
                        init()
                    }
                });
            }
        } else {
            if (this.Static[keys]) {
                this.Static[`_${keys}`] = this.Static[keys]
            }
            this.Static.__defineGetter__(keys, function () {
                return this[`_${keys}`]
            });
            this.Static.__defineSetter__(keys, function (value) {
                if (fn && fn(value, keys)) {
                    this[`_${keys}`] = value;
                    init()
                } else if (!fn && checkDifferent(this[`_${keys}`], value)) {
                    this[`_${keys}`] = value;
                    init()
                }
            });
        }
    }

    async init(index) {
        sendOn.bind(this)("start", "Start init!", this.name)

        if (!pageFront.lists.includes(this.name)) {
            pageFront.lists.push(this.name)
        }
        if (!this._VDomActual) {
            await this.loader()
        }
        this._VDomNew = VDomStartFn(await this.display(), this)

        this.$el = display(this._VDomNew, this._VDomActual, this.$el, this, index)
        this._VDomActual = this._VDomNew
        if (this._ListsInit.length) {
            for (let item of this._ListsInit) {
                item.fn.bind(this)(item.$el)
            }
            this._ListsInit = []
        }

        this._ListsEventListener = this._ListsEventListener.filter((item) => {
            if (!document.body.contains(item.$el)) {
                item.$el.removeEventListener(item.name, item.fn)
                return false
            }
            return true
        })
        sendOn.bind(this)("finish", "Finish init!", this.name, 1)

    }

}

export { Frontends, pageFront, Services, Variable, Cross }